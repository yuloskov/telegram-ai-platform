import { InlineKeyboard, InputFile } from "grammy";
import { Queue } from "bullmq";
import Redis from "ioredis";
import type { BotContext } from "../index";
import { t, type Language } from "../../i18n/index";
import { prisma } from "@repo/database";
import { editPostWithPrompt, generateSVG, generateImage, generateImagePromptFromContent, generateMultiplePostsWithImages, type SVGStyleConfig } from "@repo/ai";
import { uploadFile } from "@repo/shared/storage";
import { svgToPng, normalizeSvgDimensions } from "@repo/shared/svg";
import { QUEUE_NAMES, PUBLISHING_JOB_OPTIONS, type PublishingJobPayload } from "@repo/shared/queues";
import { editReviewMessage, getReviewKeyboard } from "./pending";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const publishQueue = new Queue<PublishingJobPayload>(QUEUE_NAMES.PUBLISHING, {
  connection: redis,
});

/**
 * Restore session state from database if lost (e.g., after service restart)
 */
async function restoreSessionState(ctx: BotContext, postId: string): Promise<boolean> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { mediaFiles: true },
  });

  if (!post) {
    console.log(`[restoreSessionState] Post not found: ${postId}`);
    return false;
  }

  const message = ctx.callbackQuery?.message;
  const imageUrl = post.mediaFiles[0]?.url;

  ctx.session.reviewEditState = {
    postId: post.id,
    channelId: post.channelId,
    contentPlanId: post.contentPlanId ?? undefined,
    originalContent: post.content,
    currentContent: post.content,
    imageUrl,
    awaitingInput: null,
    originalMessageId: message?.message_id,
    chatId: message?.chat.id,
  };

  console.log(`[restoreSessionState] Session state restored for post: ${postId}`);
  return true;
}

function getEditKeyboard(lang: Language, hasContentPlan: boolean, postId: string): InlineKeyboard {
  const keyboard = new InlineKeyboard()
    .text(t(lang, "editTextButton"), `review_edit:text:${postId}`)
    .text(t(lang, "regenerateImageButton"), `review_edit:image:${postId}`);

  if (hasContentPlan) {
    keyboard.text(t(lang, "regeneratePostButton"), `review_edit:regenerate:${postId}`);
  }

  keyboard.row()
    .text(t(lang, "publishNowButton"), `review_edit:publish:${postId}`)
    .text(t(lang, "cancelEditButton"), `review_edit:cancel:${postId}`);

  return keyboard;
}

/**
 * Send a temporary notification message that auto-deletes after a delay
 */
async function sendTempNotification(
  ctx: BotContext,
  text: string,
  delayMs: number = 3000
): Promise<void> {
  try {
    const msg = await ctx.reply(text);
    setTimeout(async () => {
      try {
        await ctx.api.deleteMessage(msg.chat.id, msg.message_id);
      } catch {
        // Ignore deletion errors
      }
    }, delayMs);
  } catch {
    // Ignore send errors
  }
}

/**
 * Edit the existing callback message to show the edit interface
 */
async function editMessageWithEditInterface(
  ctx: BotContext,
  content: string,
  lang: Language,
  hasContentPlan: boolean,
  postId: string
): Promise<void> {
  const message = ctx.callbackQuery?.message;
  if (!message) return;

  const keyboard = getEditKeyboard(lang, hasContentPlan, postId);
  const hasPhoto = "photo" in message && message.photo;

  // Photo captions limited to 1024 chars, text messages to 4096
  const maxLength = hasPhoto ? 900 : 3900;
  const preview = content.length > maxLength ? `${content.substring(0, maxLength)}...` : content;
  const caption = `<b>${t(lang, "postPreviewTitle")}</b>\n\n${preview}`;

  if (hasPhoto) {
    await ctx.editMessageCaption({
      caption,
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } else {
    await ctx.editMessageText(caption, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  }
}

/**
 * Edit the original message with updated content (used from text input handler)
 */
async function editOriginalMessageWithContent(
  ctx: BotContext,
  chatId: number,
  messageId: number,
  content: string,
  hasImage: boolean,
  lang: Language,
  hasContentPlan: boolean,
  postId: string
): Promise<void> {
  const keyboard = getEditKeyboard(lang, hasContentPlan, postId);

  // Photo captions limited to 1024 chars, text messages to 4096
  const maxLength = hasImage ? 900 : 3900;
  const preview = content.length > maxLength ? `${content.substring(0, maxLength)}...` : content;
  const caption = `<b>${t(lang, "postPreviewTitle")}</b>\n\n${preview}`;

  if (hasImage) {
    await ctx.api.editMessageCaption(chatId, messageId, {
      caption,
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } else {
    await ctx.api.editMessageText(chatId, messageId, caption, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  }
}

export async function enterReviewEditMode(ctx: BotContext, postId: string): Promise<void> {
  console.log(`[v2] enterReviewEditMode called for postId: ${postId}`);
  const lang = (ctx.session.language ?? "en") as Language;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      channel: true,
      contentPlan: true,
      mediaFiles: true,
    },
  });

  if (!post) {
    console.log(`[v2] Post not found: ${postId}`);
    await editReviewMessage(ctx, `❌ ${t(lang, "errorOccurred")}`);
    return;
  }
  console.log(`[v2] Found post with ${post.mediaFiles.length} media files`);

  // Get first image path if exists
  let imagePath: string | undefined;
  if (post.mediaFiles.length > 0) {
    const mediaFile = post.mediaFiles[0];
    if (mediaFile) {
      console.log(`[v2] enterReviewEditMode - mediaFile.url: ${mediaFile.url}`);
      imagePath = mediaFile.url;
    }
  }

  // Store state in session (store path, not buffer)
  // Also store the message ID and chat ID for editing from text input handlers
  const message = ctx.callbackQuery?.message;
  ctx.session.reviewEditState = {
    postId: post.id,
    channelId: post.channelId,
    contentPlanId: post.contentPlanId ?? undefined,
    originalContent: post.content,
    currentContent: post.content,
    imageUrl: imagePath,
    awaitingInput: null,
    originalMessageId: message?.message_id,
    chatId: message?.chat.id,
  };

  // Edit the callback message to show edit interface
  console.log(`[v2] About to edit message with edit interface`);
  await editMessageWithEditInterface(ctx, post.content, lang, !!post.contentPlanId, post.id);
  console.log(`[v2] enterReviewEditMode completed successfully`);
}

export async function handleReviewEditCallback(ctx: BotContext): Promise<void> {
  const lang = (ctx.session.language ?? "en") as Language;
  const data = ctx.callbackQuery?.data;

  if (!data?.startsWith("review_edit:")) return;

  const [, action, postId] = data.split(":");

  if (!action || !postId) {
    console.error("Invalid review_edit callback data:", data);
    await ctx.answerCallbackQuery({ text: t(lang, "errorOccurred"), show_alert: true });
    return;
  }

  try {
    switch (action) {
      case "text":
        await handleEditTextButton(ctx, lang, postId);
        break;
      case "image":
        await handleImageRegeneration(ctx, lang, postId);
        break;
      case "regenerate":
        await handlePostRegeneration(ctx, lang, postId);
        break;
      case "publish":
        await handlePublishFromEdit(ctx, lang, postId);
        break;
      case "cancel":
        await handleCancelEdit(ctx, lang, postId);
        break;
    }
  } catch (error) {
    console.error("Review edit callback error:", error);
    // Don't send another message - the individual handlers should handle errors
  }
}

async function handleEditTextButton(ctx: BotContext, lang: Language, postId: string): Promise<void> {
  await ctx.answerCallbackQuery();

  // Restore session state if missing (after restart)
  if (!ctx.session.reviewEditState) {
    const restored = await restoreSessionState(ctx, postId);
    if (!restored) {
      await ctx.reply(t(lang, "errorOccurred"));
      return;
    }
  }

  ctx.session.reviewEditState!.awaitingInput = "text_edit";
  await ctx.reply(t(lang, "sendEditInstruction"));
}

export async function handleEditTextInput(ctx: BotContext): Promise<void> {
  const lang = (ctx.session.language ?? "en") as Language;
  const state = ctx.session.reviewEditState;

  if (!state || state.awaitingInput !== "text_edit") return;

  const instruction = ctx.message?.text;
  if (!instruction) return;

  state.awaitingInput = null;

  // Send a temporary status message (will be deleted after)
  const statusMsg = await ctx.reply(t(lang, "editingPost"));

  try {
    const newContent = await editPostWithPrompt(state.currentContent, instruction, lang);

    // Update in database
    await prisma.post.update({
      where: { id: state.postId },
      data: { content: newContent },
    });

    state.currentContent = newContent;

    // Delete the status message
    try {
      await ctx.api.deleteMessage(statusMsg.chat.id, statusMsg.message_id);
    } catch {
      // Ignore deletion errors
    }

    // Edit the original review message with updated content
    if (state.originalMessageId && state.chatId) {
      await editOriginalMessageWithContent(ctx, state.chatId, state.originalMessageId, newContent, !!state.imageUrl, lang, !!state.contentPlanId, state.postId);
    }

    // Send temporary success notification
    await sendTempNotification(ctx, `✅ ${t(lang, "editSuccess")}`);
  } catch (error) {
    console.error("Edit error:", error);
    // Delete status message and show error
    try {
      await ctx.api.deleteMessage(statusMsg.chat.id, statusMsg.message_id);
    } catch {
      // Ignore deletion errors
    }
    await ctx.reply(t(lang, "editFailed"));
  }
}

async function handleImageRegeneration(ctx: BotContext, lang: Language, postId: string): Promise<void> {
  // Restore session state if missing (after restart)
  if (!ctx.session.reviewEditState) {
    const restored = await restoreSessionState(ctx, postId);
    if (!restored) {
      await ctx.answerCallbackQuery({ text: t(lang, "errorOccurred"), show_alert: true });
      return;
    }
  }

  const state = ctx.session.reviewEditState!;

  // Answer callback with loading message
  await ctx.answerCallbackQuery({ text: t(lang, "regeneratingImage") });

  try {
    const post = await prisma.post.findUnique({
      where: { id: state.postId },
      include: { contentPlan: true, mediaFiles: true },
    });

    if (!post) {
      await ctx.reply(t(lang, "errorOccurred"));
      return;
    }

    let imageBuffer: Buffer | null = null;
    const imageType = post.contentPlan?.imageType ?? "svg";

    if (imageType === "svg") {
      const svgStyle: SVGStyleConfig = {
        themeColor: post.contentPlan?.svgThemeColor ?? "#3B82F6",
        textColor: "#FFFFFF",
        backgroundStyle: (post.contentPlan?.svgBackgroundStyle as SVGStyleConfig["backgroundStyle"]) ?? "gradient",
        fontStyle: (post.contentPlan?.svgFontStyle as SVGStyleConfig["fontStyle"]) ?? "modern",
        stylePrompt: post.contentPlan?.svgStylePrompt ?? undefined,
      };

      const result = await generateSVG(state.currentContent, svgStyle, lang);
      if (result?.svg) {
        const normalizedSvg = normalizeSvgDimensions(result.svg);
        imageBuffer = await svgToPng(normalizedSvg, { width: 1080 });
      }
    } else {
      const imagePrompt = await generateImagePromptFromContent(state.currentContent, lang);
      if (imagePrompt) {
        const imageData = await generateImage(imagePrompt);
        if (imageData && imageData.startsWith("data:image")) {
          const base64Data = imageData.split(",")[1];
          if (base64Data) {
            imageBuffer = Buffer.from(base64Data, "base64");
          }
        }
      }
    }

    if (!imageBuffer) {
      await ctx.reply(t(lang, "imageRegenerationFailed"));
      return;
    }

    // Upload new image
    const objectName = `generated/${state.postId}/${Date.now()}.png`;
    const mediaPath = `/api/media/telegram-platform/${objectName}`;
    await uploadFile("telegram-platform", objectName, imageBuffer, "image/png");

    // Delete old media files and create new one
    await prisma.mediaFile.deleteMany({ where: { postId: state.postId } });
    await prisma.mediaFile.create({
      data: {
        postId: state.postId,
        url: mediaPath,
        type: "photo",
        filename: `${Date.now()}.png`,
        mimeType: "image/png",
        size: imageBuffer.length,
        isGenerated: true,
      },
    });

    // Store the path for future reference
    state.imageUrl = mediaPath;

    // Edit the message with new media using editMessageMedia
    const keyboard = getEditKeyboard(lang, !!state.contentPlanId, postId);
    const maxLength = 900; // Photo captions limited to 1024 chars
    const preview = state.currentContent.length > maxLength
      ? `${state.currentContent.substring(0, maxLength)}...`
      : state.currentContent;
    const caption = `<b>${t(lang, "postPreviewTitle")}</b>\n\n${preview}`;

    await ctx.editMessageMedia(
      {
        type: "photo",
        media: new InputFile(imageBuffer),
        caption,
        parse_mode: "HTML",
      },
      { reply_markup: keyboard }
    );

    // Send temporary success notification
    await sendTempNotification(ctx, `✅ ${t(lang, "imageRegenerated")}`);
  } catch (error) {
    console.error("Image regeneration error:", error);
    // Send error as a reply to keep the edit interface visible for retry
    await ctx.reply(t(lang, "imageRegenerationFailed"));
  }
}

async function handlePostRegeneration(ctx: BotContext, lang: Language, postId: string): Promise<void> {
  // Restore session state if missing (after restart)
  if (!ctx.session.reviewEditState) {
    const restored = await restoreSessionState(ctx, postId);
    if (!restored) {
      await ctx.answerCallbackQuery({ text: t(lang, "errorOccurred"), show_alert: true });
      return;
    }
  }

  const state = ctx.session.reviewEditState!;

  if (!state.contentPlanId) {
    await ctx.answerCallbackQuery({ text: t(lang, "noContentPlan"), show_alert: true });
    return;
  }

  await ctx.answerCallbackQuery({ text: t(lang, "regeneratingPost") });

  try {
    // Fetch content plan with sources
    const plan = await prisma.contentPlan.findUnique({
      where: { id: state.contentPlanId },
      include: {
        channel: true,
        contentSources: {
          include: { contentSource: true },
        },
      },
    });

    if (!plan) {
      await ctx.reply(t(lang, "noContentPlan"));
      return;
    }

    // Get previous posts for context (exclude current post)
    const previousPosts = await prisma.post.findMany({
      where: {
        contentPlanId: plan.id,
        id: { not: state.postId },
      },
      orderBy: { createdAt: "desc" },
      take: plan.lookbackPostCount,
      select: { content: true },
    });

    // Get scraped content from sources
    const sourceIds = plan.contentSources.map((s) => s.contentSourceId);
    let scrapedContent: { id: string; text: string | null; views: number; mediaUrls: string[] }[] = [];

    if (sourceIds.length > 0) {
      scrapedContent = await prisma.scrapedContent.findMany({
        where: {
          sourceId: { in: sourceIds },
          usedForGeneration: false,
        },
        orderBy: { scrapedAt: "desc" },
        take: 20,
        select: {
          id: true,
          text: true,
          views: true,
          mediaUrls: true,
        },
      });
    }

    // Build channel context
    const channelContext = {
      niche: plan.channel.niche ?? undefined,
      tone: plan.toneOverride ?? plan.channel.tone,
      language: plan.languageOverride ?? plan.channel.language,
      hashtags: plan.channel.hashtags,
    };

    // Generate new content
    const result = await generateMultiplePostsWithImages(
      channelContext,
      scrapedContent.map((c) => ({
        id: c.id,
        text: c.text,
        views: c.views,
        hasImages: c.mediaUrls.filter((url) => !url.startsWith("skipped:")).length > 0,
        imageCount: c.mediaUrls.filter((url) => !url.startsWith("skipped:")).length,
      })),
      previousPosts.map((p) => p.content),
      plan.promptTemplate || undefined,
      1
    );

    if (result.posts.length === 0) {
      await ctx.reply(t(lang, "regenerationFailed"));
      return;
    }

    const generatedPost = result.posts[0]!;

    // Generate new image if enabled
    let imageBuffer: Buffer | null = null;
    let mediaPath: string | undefined;

    if (plan.imageEnabled) {
      if (plan.imageType === "svg") {
        const svgStyle: SVGStyleConfig = {
          themeColor: plan.svgThemeColor,
          textColor: "#FFFFFF",
          backgroundStyle: plan.svgBackgroundStyle as SVGStyleConfig["backgroundStyle"],
          fontStyle: plan.svgFontStyle as SVGStyleConfig["fontStyle"],
          stylePrompt: plan.svgStylePrompt ?? undefined,
        };

        const svgResult = await generateSVG(generatedPost.content, svgStyle, channelContext.language);
        if (svgResult?.svg) {
          const normalizedSvg = normalizeSvgDimensions(svgResult.svg);
          imageBuffer = await svgToPng(normalizedSvg, { width: 1080 });
        }
      } else {
        const imagePrompt = await generateImagePromptFromContent(generatedPost.content, channelContext.language);
        if (imagePrompt) {
          const imageData = await generateImage(imagePrompt);
          if (imageData && imageData.startsWith("data:image")) {
            const base64Data = imageData.split(",")[1];
            if (base64Data) {
              imageBuffer = Buffer.from(base64Data, "base64");
            }
          }
        }
      }
    }

    if (imageBuffer) {
      const objectName = `generated/${state.postId}/${Date.now()}.png`;
      mediaPath = `/api/media/telegram-platform/${objectName}`;
      await uploadFile("telegram-platform", objectName, imageBuffer, "image/png");

      // Update media files
      await prisma.mediaFile.deleteMany({ where: { postId: state.postId } });
      await prisma.mediaFile.create({
        data: {
          postId: state.postId,
          url: mediaPath,
          type: "photo",
          filename: `${Date.now()}.png`,
          mimeType: "image/png",
          size: imageBuffer.length,
          isGenerated: true,
        },
      });
    }

    // Update post content
    await prisma.post.update({
      where: { id: state.postId },
      data: { content: generatedPost.content },
    });

    // Mark scraped content as used
    if (generatedPost.sourceIds.length > 0) {
      await prisma.scrapedContent.updateMany({
        where: { id: { in: generatedPost.sourceIds } },
        data: { usedForGeneration: true },
      });
    }

    // Update session state
    state.currentContent = generatedPost.content;
    state.originalContent = generatedPost.content;
    if (mediaPath) {
      state.imageUrl = mediaPath;
    }

    // Edit message with new content
    const keyboard = getEditKeyboard(lang, true, postId);
    const maxLength = imageBuffer ? 900 : 3900;
    const preview = generatedPost.content.length > maxLength
      ? `${generatedPost.content.substring(0, maxLength)}...`
      : generatedPost.content;
    const caption = `<b>${t(lang, "postPreviewTitle")}</b>\n\n${preview}`;

    if (imageBuffer) {
      await ctx.editMessageMedia(
        {
          type: "photo",
          media: new InputFile(imageBuffer),
          caption,
          parse_mode: "HTML",
        },
        { reply_markup: keyboard }
      );
    } else {
      await ctx.editMessageText(caption, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    }

    // Send temporary success notification
    await sendTempNotification(ctx, `✅ ${t(lang, "postRegenerated")}`);
  } catch (error) {
    console.error("Post regeneration error:", error);
    await ctx.reply(t(lang, "regenerationFailed"));
  }
}

async function handlePublishFromEdit(ctx: BotContext, lang: Language, postId: string): Promise<void> {
  await ctx.answerCallbackQuery({ text: t(lang, "postPublished") });

  // For publish, we don't need full session state - just use postId directly
  const state = ctx.session.reviewEditState;

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { channel: true },
    });

    if (!post) {
      await editReviewMessage(ctx, `❌ ${t(lang, "errorOccurred")}`);
      return;
    }

    // Update post status
    await prisma.post.update({
      where: { id: postId },
      data: { status: "publishing" },
    });

    // Remove pending review
    await prisma.pendingReview.deleteMany({
      where: { postId },
    });

    // Queue publishing job
    await publishQueue.add(
      "publish",
      {
        postId,
        channelTelegramId: post.channel.telegramId.toString(),
      },
      PUBLISHING_JOB_OPTIONS
    );

    // Clear session state
    ctx.session.reviewEditState = undefined;

    // Edit message in-place to show publish status (no keyboard = removes buttons)
    const resultText = `✅ <b>${t(lang, "postPublished")}</b>\n\n${post.channel.title}`;
    await editReviewMessage(ctx, resultText);
  } catch (error) {
    console.error("Publish error:", error);
    await editReviewMessage(ctx, `❌ ${t(lang, "errorOccurred")}`);
  }
}

async function handleCancelEdit(ctx: BotContext, lang: Language, postId: string): Promise<void> {
  await ctx.answerCallbackQuery();

  const state = ctx.session.reviewEditState;

  // If we have session state, restore original content if changed
  if (state && state.currentContent !== state.originalContent) {
    await prisma.post.update({
      where: { id: postId },
      data: { content: state.originalContent },
    });
  }

  // Get post with channel title for the message
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { channel: true },
  });

  ctx.session.reviewEditState = undefined;

  if (!post) {
    await editReviewMessage(ctx, `❌ ${t(lang, "errorOccurred")}`);
    return;
  }

  // Edit message to restore original review view with review buttons
  // Use post.content from DB (which may have been restored to original above)
  const message = ctx.callbackQuery?.message;
  const hasPhoto = message && "photo" in message && message.photo;
  const maxLength = hasPhoto ? 900 : 3900;
  const preview = post.content.length > maxLength
    ? `${post.content.substring(0, maxLength)}...`
    : post.content;
  const text = `<b>${post.channel.title}</b>\n\n${preview}`;
  const keyboard = getReviewKeyboard(postId, lang);

  await editReviewMessage(ctx, text, keyboard);
}
