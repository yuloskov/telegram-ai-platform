import { InlineKeyboard } from "grammy";
import type { BotContext } from "../index";
import { t, type Language } from "../../i18n/index";
import { prisma } from "@repo/database";

export async function handleLang(ctx: BotContext): Promise<void> {
  const keyboard = new InlineKeyboard()
    .text("English", "lang:en")
    .text("Русский", "lang:ru");

  await ctx.reply("Select your language / Выберите язык:", {
    reply_markup: keyboard,
  });
}

export async function handleLangCallback(ctx: BotContext): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith("lang:")) return;

  const newLang = data.replace("lang:", "") as Language;
  ctx.session.language = newLang;

  // Update user's language preference in database if they exist
  const telegramId = ctx.from?.id;
  if (telegramId) {
    try {
      await prisma.user.updateMany({
        where: { telegramId: BigInt(telegramId) },
        data: { language: newLang },
      });
    } catch {
      // User might not exist yet, that's ok
    }
  }

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(t(newLang, "languageChanged"));
}
