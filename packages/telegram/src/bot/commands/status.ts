import type { BotContext } from "../index";
import { t, type Language } from "../../i18n/index";
import { prisma } from "@repo/database";

export async function handleStatus(ctx: BotContext): Promise<void> {
  const lang = (ctx.session.language ?? "en") as Language;
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    await ctx.reply(t(lang, "errorOccurred"));
    return;
  }

  // Get user from database
  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(telegramId) },
    include: {
      channels: {
        where: { isActive: true },
        include: {
          _count: {
            select: {
              posts: {
                where: {
                  status: { in: ["draft", "scheduled", "pending_review"] },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    await ctx.reply(t(lang, "notAuthenticated"));
    return;
  }

  if (user.channels.length === 0) {
    await ctx.reply(t(lang, "noChannels"));
    return;
  }

  let message = `<b>${t(lang, "statusOverview")}</b>\n\n`;

  for (const channel of user.channels) {
    const pendingCount = channel._count.posts;
    message += `📢 <b>${channel.title}</b>\n`;
    message += `   └ ${pendingCount} pending posts\n`;
  }

  await ctx.reply(message, { parse_mode: "HTML" });
}
