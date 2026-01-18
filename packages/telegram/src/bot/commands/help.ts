import type { BotContext } from "../index";
import { t, type Language } from "../../i18n/index";

export async function handleHelp(ctx: BotContext): Promise<void> {
  const lang = (ctx.session.language ?? "en") as Language;

  const helpMessage = `<b>${t(lang, "helpTitle")}</b>\n${t(lang, "helpCommands")}`;

  await ctx.reply(helpMessage, {
    parse_mode: "HTML",
  });
}
