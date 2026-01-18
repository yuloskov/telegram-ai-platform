import type { BotContext } from "../index";
import { t, type Language } from "../../i18n/index";
import { prisma } from "@repo/database";

export async function handleChannels(ctx: BotContext): Promise<void> {
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
              posts: true,
              contentSources: true,
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

  let message = `<b>${t(lang, "channelsList")}</b>\n\n`;

  for (const channel of user.channels) {
    const username = channel.username ? `@${channel.username}` : "";
    message += `📢 <b>${channel.title}</b> ${username}\n`;
    message += `   ├ ${channel._count.posts} posts\n`;
    message += `   ├ ${channel._count.contentSources} sources\n`;
    message += `   └ ${channel.tone} tone, ${channel.language}\n\n`;
  }

  await ctx.reply(message, { parse_mode: "HTML" });
}
