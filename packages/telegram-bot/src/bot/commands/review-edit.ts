import { InlineKeyboard, InputFile } from "grammy";
import { Queue } from "bullmq";
import Redis from "ioredis";
import type { BotContext } from "../index";
import { t, type Language } from "../../i18n/index";
import { prisma } from "@repo/database";
import { editPostWithPrompt, generateSVG, generateImage, generateImagePromptFromContent, type SVGStyleConfig } from "@repo/ai";
import { uploadFile, getFileBuffer } from "@repo/shared/storage";
import { svgToPng, normalizeSvgDimensions } from "@repo/shared/svg";
import { QUEUE_NAMES, PUBLISHING_JOB_OPTIONS, type PublishingJobPayload } from "@repo/shared/queues";

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
    await ctx.reply(t(lang, "errorOccurred"));
    return;
  }
  console.log(`[v2] Found post with ${post.mediaFiles.length} media files`);

  // Get first image buffer if exists
  let imageBuffer: Buffer | undefined;
  let imagePath: string | undefined;
  if (post.mediaFiles.length > 0) {
    const mediaFile = post.mediaFiles[0];
    if (mediaFile) {
      console.log(`[v2] enterReviewEditMode - mediaFile.url: ${mediaFile.url}`);
      // Parse URL format: /api/media/{bucket}/{objectName}
      const match = mediaFile.url.match(/^\/api\/media\/([^/]+)\/(.+)$/);
      if (match) {
        const [, bucket, objectName] = match;
        console.log(`[v2] Fetching image from bucket: ${bucket}, objectName: ${objectName}`);
        try {
          imageBuffer = await getFileBuffer(bucket!, objectName!);
          imagePath = mediaFile.url;
          console.log(`[v2] Got image buffer: ${imageBuffer.length} bytes`);
        } catch (err) {
          console.error(`[v2] Failed to fetch image:`, err);
        }
      } else {
        console.error(`[v2] Failed to parse mediaFile.url: ${mediaFile.url}`);
      }
    }
  }

  // Store state in session (store path, not buffer)
  ctx.session.reviewEditState = {
    postId: post.id,
    channelId: post.channelId,
    contentPlanId: post.contentPlanId ?? undefined,
    originalContent: post.content,
    currentContent: post.content,
    imageUrl: imagePath, // Store the path for later reference
    awaitingInput: null,
  };

  console.log(`[v2] About to call sendEditablePreview`);
  await sendEditablePreview(ctx, post.content, imageBuffer, lang);
  console.log(`[v2] enterReviewEditMode completed successfully`);
}

async function sendEditablePreview(
  ctx: BotContext,
  content: string,
  imageBuffer: Buffer | undefined,
  lang: Language
): Promise<void> {
  console.log(`[v2] sendEditablePreview called with imageBuffer: ${imageBuffer ? `${imageBuffer.length} bytes` : 'undefined'}`);
  const keyboard = getEditKeyboard(lang);
  // Photo captions limited to 1024 chars, text messages to 4096
  const maxLength = imageBuffer ? 900 : 3900;
  const preview = content.length > maxLength ? `${content.substring(0, maxLength)}...` : content;
  const caption = `<b>${t(lang, "postPreviewTitle")}</b>\n\n${preview}`;
  console.log(`[v2] Caption length: ${caption.length}, sending ${imageBuffer ? 'photo' : 'text'}`);

  try {
    if (imageBuffer) {
      await ctx.replyWithPhoto(new InputFile(imageBuffer), {
        caption,
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
      console.log(`[v2] Photo sent successfully`);
    } else {
      await ctx.reply(caption, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
      console.log(`[v2] Text sent successfully`);
    }
  } catch (err) {
    console.error(`[v2] sendEditablePreview error:`, err);
    throw err;
  }
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
  await ctx.reply(t(lang, "editingPost"));

  try {
    const newContent = await editPostWithPrompt(state.currentContent, instruction, lang);

    // Update in database
    await prisma.post.update({
      where: { id: state.postId },
      data: { content: newContent },
    });

    state.currentContent = newContent;

    await ctx.reply(t(lang, "editSuccess"));

    // Fetch image buffer from stored path
    let imageBuffer: Buffer | undefined;
    if (state.imageUrl) {
      const match = state.imageUrl.match(/^\/api\/media\/([^/]+)\/(.+)$/);
      if (match) {
        try {
          imageBuffer = await getFileBuffer(match[1]!, match[2]!);
        } catch (err) {
          console.error("Failed to fetch image for preview:", err);
        }
      }
    }
    await sendEditablePreview(ctx, newContent, imageBuffer, lang);
  } catch (error) {
    console.error("Edit error:", error);
    await ctx.reply(t(lang, "editFailed"));
  }
}

async function handleImageRegeneration(ctx: BotContext, lang: Language): Promise<void> {
  await ctx.answerCallbackQuery();

  const state = ctx.session.reviewEditState;
  if (!state) {
    await ctx.reply(t(lang, "errorOccurred"));
    return;
  }

  await ctx.reply(t(lang, "regeneratingImage"));

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

    await ctx.reply(t(lang, "imageRegenerated"));
    // Use the buffer we already have
    await sendEditablePreview(ctx, state.currentContent, imageBuffer, lang);
  } catch (error) {
    console.error("Image regeneration error:", error);
    await ctx.reply(t(lang, "imageRegenerationFailed"));
  }
}

async function handlePublishFromEdit(ctx: BotContext, lang: Language): Promise<void> {
  await ctx.answerCallbackQuery();

  const state = ctx.session.reviewEditState;
  if (!state) {
    await ctx.reply(t(lang, "errorOccurred"));
    return;
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id: state.postId },
      include: { channel: true },
    });

    if (!post) {
      await ctx.reply(t(lang, "errorOccurred"));
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

    await ctx.reply(t(lang, "postPublished"));
  } catch (error) {
    console.error("Publish error:", error);
    await ctx.reply(t(lang, "errorOccurred"));
  }
}

async function handleCancelEdit(ctx: BotContext, lang: Language): Promise<void> {
  await ctx.answerCallbackQuery();

  const state = ctx.session.reviewEditState;
  if (!state) {
    await ctx.reply(t(lang, "errorOccurred"));
    return;
  }

  // Restore original content if changed
  if (state.currentContent !== state.originalContent) {
    await prisma.post.update({
      where: { id: state.postId },
      data: { content: state.originalContent },
    });
  }

  ctx.session.reviewEditState = undefined;
  await ctx.reply(t(lang, "editCancelled"));
}
