import { InlineKeyboard } from "grammy";
import { Queue } from "bullmq";
import Redis from "ioredis";
import type { BotContext } from "../index";
import { t, getReviewButtons, type Language } from "../../i18n/index";
import { prisma } from "@repo/database";
import { QUEUE_NAMES, PUBLISHING_JOB_OPTIONS, type PublishingJobPayload } from "@repo/shared/queues";
import { enterReviewEditMode } from "./review-edit";

/**
 * Creates an inline keyboard with review buttons for a post
 */
export function getReviewKeyboard(postId: string, lang: Language): InlineKeyboard {
  const buttons = getReviewButtons(lang);
  return new InlineKeyboard()
    .text(buttons.approve, `review:approve:${postId}`)
    .text(buttons.reject, `review:reject:${postId}`)
    .row()
    .text(buttons.edit, `review:edit:${postId}`)
    .text(buttons.schedule, `review:schedule:${postId}`);
}

/**
 * Helper function to edit the review message in-place
 * Handles both photo messages (editMessageCaption) and text messages (editMessageText)
 */
export async function editReviewMessage(
  ctx: BotContext,
  text: string,
  keyboard?: InlineKeyboard
): Promise<void> {
  const message = ctx.callbackQuery?.message;
  if (!message) return;

  const hasPhoto = "photo" in message && message.photo;

  if (hasPhoto) {
    await ctx.editMessageCaption({
      caption: text,
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } else {
    await ctx.editMessageText(text, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  }
}

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const publishQueue = new Queue<PublishingJobPayload>(QUEUE_NAMES.PUBLISHING, {
  connection: redis,
});

export async function handlePending(ctx: BotContext): Promise<void> {
  const lang = (ctx.session.language ?? "en") as Language;
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    await ctx.reply(t(lang, "errorOccurred"));
    return;
  }

  // Get user's pending posts
  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(telegramId) },
    include: {
      channels: {
        include: {
          posts: {
            where: { status: "pending_review" },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      },
    },
  });

  if (!user) {
    await ctx.reply(t(lang, "notAuthenticated"));
    return;
  }

  // Collect all pending posts across channels
  const pendingPosts = user.channels.flatMap((channel) =>
    channel.posts.map((post) => ({
      ...post,
      channelTitle: channel.title,
    }))
  );

  if (pendingPosts.length === 0) {
    await ctx.reply(t(lang, "noPendingPosts"));
    return;
  }

  await ctx.reply(`<b>${t(lang, "pendingPosts")}</b>`, { parse_mode: "HTML" });

  // Send each pending post for review
  for (const post of pendingPosts) {
    const preview =
      post.content.length > 200
        ? `${post.content.substring(0, 200)}...`
        : post.content;

    await ctx.reply(
      `<b>${post.channelTitle}</b>\n\n${preview}`,
      {
        parse_mode: "HTML",
        reply_markup: getReviewKeyboard(post.id, lang),
      }
    );
  }
}

export async function handleReviewCallback(ctx: BotContext): Promise<void> {
  const lang = (ctx.session.language ?? "en") as Language;
  const data = ctx.callbackQuery?.data;

  if (!data?.startsWith("review:")) return;

  const [, action, postId] = data.split(":");

  if (!action || !postId) return;

  switch (action) {
    case "approve":
      await handleApprove(ctx, postId, lang);
      break;
    case "reject":
      await handleReject(ctx, postId, lang);
      break;
    case "edit":
      await handleEdit(ctx, postId, lang);
      break;
    case "schedule":
      await handleSchedule(ctx, postId, lang);
      break;
  }
}

async function handleApprove(ctx: BotContext, postId: string, lang: Language): Promise<void> {
  // Answer callback immediately to avoid timeout
  await ctx.answerCallbackQuery({ text: t(lang, "approved") });

  // Clear any pending edit state
  ctx.session.reviewEditState = undefined;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { channel: true },
  });

  if (!post) {
    await editReviewMessage(ctx, `❌ ${t(lang, "errorOccurred")}`);
    return;
  }

  // Update post status to publishing
  await prisma.post.update({
    where: { id: postId },
    data: { status: "publishing" },
  });

  // Remove pending review record
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

  // Edit message in-place to show approval status (no keyboard = removes buttons)
  const resultText = `✅ <b>${t(lang, "approved")}</b>\n\n${post.channel.title}`;
  await editReviewMessage(ctx, resultText);
}

async function handleReject(ctx: BotContext, postId: string, lang: Language): Promise<void> {
  // Answer callback immediately to avoid timeout
  await ctx.answerCallbackQuery({ text: t(lang, "rejected") });

  // Clear any pending edit state
  ctx.session.reviewEditState = undefined;

  await prisma.post.update({
    where: { id: postId },
    data: { status: "draft" },
  });

  await prisma.pendingReview.deleteMany({
    where: { postId },
  });

  // Edit message in-place to show rejection status (no keyboard = removes buttons)
  const resultText = `❌ <b>${t(lang, "rejected")}</b>`;
  await editReviewMessage(ctx, resultText);
}

async function handleEdit(ctx: BotContext, postId: string, lang: Language): Promise<void> {
  console.log(`[v2] handleEdit called for postId: ${postId}`);
  await ctx.answerCallbackQuery();
  try {
    await enterReviewEditMode(ctx, postId);
  } catch (error) {
    console.error(`[v2] enterReviewEditMode error:`, error);
    await ctx.reply(t(lang, "errorOccurred"));
  }
}

async function handleSchedule(ctx: BotContext, postId: string, lang: Language): Promise<void> {
  // Answer callback immediately to avoid timeout
  await ctx.answerCallbackQuery({ text: t(lang, "scheduled") });

  // Clear any pending edit state
  ctx.session.reviewEditState = undefined;

  // Update to scheduled with default time (1 hour from now)
  const scheduledAt = new Date();
  scheduledAt.setHours(scheduledAt.getHours() + 1);

  await prisma.post.update({
    where: { id: postId },
    data: {
      status: "scheduled",
      scheduledAt,
    },
  });

  await prisma.pendingReview.deleteMany({
    where: { postId },
  });

  // Edit message in-place to show schedule status (no keyboard = removes buttons)
  const resultText = `📅 <b>${t(lang, "scheduled")}</b>\n\n${scheduledAt.toLocaleString()}`;
  await editReviewMessage(ctx, resultText);
}
