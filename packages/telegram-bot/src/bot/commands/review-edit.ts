import { InlineKeyboard, InputFile } from "grammy";
import { Queue } from "bullmq";
import Redis from "ioredis";
import type { BotContext } from "../index";
import { t, type Language } from "../../i18n/index";
import { prisma } from "@repo/database";
import { editPostWithPrompt, generateSVG, generateImage, generateImagePromptFromContent, type SVGStyleConfig } from "@repo/ai";
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

function getEditKeyboard(lang: Language): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(lang, "editTextButton"), "review_edit:text")
    .text(t(lang, "regenerateImageButton"), "review_edit:image")
    .row()
    .text(t(lang, "publishNowButton"), "review_edit:publish")
    .text(t(lang, "cancelEditButton"), "review_edit:cancel");
}

/**
 * Edit the existing callback message to show the edit interface
 */
async function editMessageWithEditInterface(
  ctx: BotContext,
  content: string,
  lang: Language
): Promise<void> {
  const message = ctx.callbackQuery?.message;
  if (!message) return;

  const keyboard = getEditKeyboard(lang);
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
  lang: Language
): Promise<void> {
  const keyboard = getEditKeyboard(lang);

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
  await editMessageWithEditInterface(ctx, post.content, lang);
  console.log(`[v2] enterReviewEditMode completed successfully`);
}

export async function handleReviewEditCallback(ctx: BotContext): Promise<void> {
  const lang = (ctx.session.language ?? "en") as Language;
  const data = ctx.callbackQuery?.data;

  if (!data?.startsWith("review_edit:")) return;

  const action = data.split(":")[1];

  switch (action) {
    case "text":
      await handleEditTextButton(ctx, lang);
      break;
    case "image":
      await handleImageRegeneration(ctx, lang);
      break;
    case "publish":
      await handlePublishFromEdit(ctx, lang);
      break;
    case "cancel":
      await handleCancelEdit(ctx, lang);
      break;
  }
}

async function handleEditTextButton(ctx: BotContext, lang: Language): Promise<void> {
  await ctx.answerCallbackQuery();

  if (!ctx.session.reviewEditState) {
    await ctx.reply(t(lang, "errorOccurred"));
    return;
  }

  ctx.session.reviewEditState.awaitingInput = "text_edit";
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
      await editOriginalMessageWithContent(ctx, state.chatId, state.originalMessageId, newContent, !!state.imageUrl, lang);
    }
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

async function handleImageRegeneration(ctx: BotContext, lang: Language): Promise<void> {
  await ctx.answerCallbackQuery({ text: t(lang, "regeneratingImage") });

  const state = ctx.session.reviewEditState;
  if (!state) {
    await editReviewMessage(ctx, `❌ ${t(lang, "errorOccurred")}`);
    return;
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id: state.postId },
      include: { contentPlan: true, mediaFiles: true },
    });

    if (!post) {
      await editReviewMessage(ctx, `❌ ${t(lang, "errorOccurred")}`);
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
    const keyboard = getEditKeyboard(lang);
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
  } catch (error) {
    console.error("Image regeneration error:", error);
    await ctx.reply(t(lang, "imageRegenerationFailed"));
  }
}

async function handlePublishFromEdit(ctx: BotContext, lang: Language): Promise<void> {
  await ctx.answerCallbackQuery({ text: t(lang, "postPublished") });

  const state = ctx.session.reviewEditState;
  if (!state) {
    await editReviewMessage(ctx, `❌ ${t(lang, "errorOccurred")}`);
    return;
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id: state.postId },
      include: { channel: true },
    });

    if (!post) {
      await editReviewMessage(ctx, `❌ ${t(lang, "errorOccurred")}`);
      return;
    }

    // Update post status
    await prisma.post.update({
      where: { id: state.postId },
      data: { status: "publishing" },
    });

    // Remove pending review
    await prisma.pendingReview.deleteMany({
      where: { postId: state.postId },
    });

    // Queue publishing job
    await publishQueue.add(
      "publish",
      {
        postId: state.postId,
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

async function handleCancelEdit(ctx: BotContext, lang: Language): Promise<void> {
  await ctx.answerCallbackQuery();

  const state = ctx.session.reviewEditState;
  if (!state) {
    await editReviewMessage(ctx, `❌ ${t(lang, "errorOccurred")}`);
    return;
  }

  // Restore original content if changed
  if (state.currentContent !== state.originalContent) {
    await prisma.post.update({
      where: { id: state.postId },
      data: { content: state.originalContent },
    });
  }

  // Get channel title for the message
  const post = await prisma.post.findUnique({
    where: { id: state.postId },
    include: { channel: true },
  });

  const postId = state.postId;
  ctx.session.reviewEditState = undefined;

  if (!post) {
    await editReviewMessage(ctx, `❌ ${t(lang, "errorOccurred")}`);
    return;
  }

  // Edit message to restore original review view with review buttons
  const message = ctx.callbackQuery?.message;
  const hasPhoto = message && "photo" in message && message.photo;
  const maxLength = hasPhoto ? 900 : 3900;
  const preview = state.originalContent.length > maxLength
    ? `${state.originalContent.substring(0, maxLength)}...`
    : state.originalContent;
  const text = `<b>${post.channel.title}</b>\n\n${preview}`;
  const keyboard = getReviewKeyboard(postId, lang);

  await editReviewMessage(ctx, text, keyboard);
}
