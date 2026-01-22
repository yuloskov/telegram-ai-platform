import { InlineKeyboard } from "grammy";
import type { BotContext } from "../index";
import { t, getReviewButtons, type Language } from "../../i18n/index";
import { prisma } from "@repo/database";
import { enterReviewEditMode } from "./review-edit";

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
  const buttons = getReviewButtons(lang);
  for (const post of pendingPosts) {
    const preview =
      post.content.length > 200
        ? `${post.content.substring(0, 200)}...`
        : post.content;

    const keyboard = new InlineKeyboard()
      .text(buttons.approve, `review:approve:${post.id}`)
      .text(buttons.reject, `review:reject:${post.id}`)
      .row()
      .text(buttons.edit, `review:edit:${post.id}`)
      .text(buttons.schedule, `review:schedule:${post.id}`);

    await ctx.reply(
      `<b>${post.channelTitle}</b>\n\n${preview}`,
      {
        parse_mode: "HTML",
        reply_markup: keyboard,
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
  // Clear any pending edit state
  ctx.session.reviewEditState = undefined;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { channel: true },
  });

  if (!post) {
    await ctx.answerCallbackQuery({ text: t(lang, "errorOccurred") });
    return;
  }

  // Update post status to publishing (worker will handle actual publishing)
  await prisma.post.update({
    where: { id: postId },
    data: { status: "publishing" },
  });

  // Remove pending review record
  await prisma.pendingReview.deleteMany({
    where: { postId },
  });

  await ctx.answerCallbackQuery({ text: t(lang, "approved") });
  await ctx.reply(`✅ ${t(lang, "approved")}`, { parse_mode: "HTML" });
}

async function handleReject(ctx: BotContext, postId: string, lang: Language): Promise<void> {
  // Clear any pending edit state
  ctx.session.reviewEditState = undefined;

  await prisma.post.update({
    where: { id: postId },
    data: { status: "draft" },
  });

  await prisma.pendingReview.deleteMany({
    where: { postId },
  });

  await ctx.answerCallbackQuery({ text: t(lang, "rejected") });
  await ctx.reply(`❌ ${t(lang, "rejected")}`, { parse_mode: "HTML" });
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
  // Clear any pending edit state
  ctx.session.reviewEditState = undefined;

  await ctx.answerCallbackQuery({ text: t(lang, "scheduled") });

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

  await ctx.reply(
    `📅 ${t(lang, "scheduled")}\n\nScheduled for: ${scheduledAt.toISOString()}`,
    { parse_mode: "HTML" }
  );
}
