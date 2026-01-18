import type { BotContext } from "../index";
import { t, type Language } from "../../i18n/index";

export async function handleStart(ctx: BotContext): Promise<void> {
  const lang = (ctx.session.language ?? "en") as Language;
  const user = ctx.from;

  if (!user) {
    await ctx.reply(t(lang, "errorOccurred"));
    return;
  }

  const welcomeMessage = `${t(lang, "welcome")}\n\n${t(lang, "welcomeDescription")}\n\n${t(lang, "loginPrompt")}`;

  await ctx.reply(welcomeMessage, {
    parse_mode: "HTML",
  });
}
