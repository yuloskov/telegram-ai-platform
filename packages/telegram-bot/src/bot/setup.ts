import type { Bot } from "grammy";
import type { BotContext } from "./index";
import {
  handleStart,
  handleHelp,
  handleLang,
  handleLangCallback,
  handleStatus,
  handleChannels,
  handlePending,
  handleReviewCallback,
  handleAuthCode,
  handleLogin,
  handleReviewEditCallback,
  handleEditTextInput,
} from "./commands/index";

export function setupBot(bot: Bot<BotContext>): void {
  // Commands
  bot.command("start", handleStart);
  bot.command("help", handleHelp);
  bot.command("lang", handleLang);
  bot.command("status", handleStatus);
  bot.command("channels", handleChannels);
  bot.command("pending", handlePending);
  bot.command("login", handleLogin);

  // Callback queries
  bot.callbackQuery(/^lang:/, handleLangCallback);
  bot.callbackQuery(/^review:/, handleReviewCallback);
  bot.callbackQuery(/^review_edit:/, handleReviewEditCallback);

  // Text messages - check for review edit mode first, then auth codes
  bot.on("message:text", async (ctx, next) => {
    if (ctx.session.reviewEditState?.awaitingInput === "text_edit") {
      await handleEditTextInput(ctx);
      return;
    }
    await next();
  });
  bot.on("message:text", handleAuthCode);

  // Error handler
  bot.catch((err) => {
    console.error("Bot error:", err);
  });
}

export async function setCommands(bot: Bot<BotContext>): Promise<void> {
  await bot.api.setMyCommands([
    { command: "start", description: "Welcome message and help" },
    { command: "login", description: "Login instructions" },
    { command: "status", description: "Overview of your channels" },
    { command: "channels", description: "List your managed channels" },
    { command: "pending", description: "View posts awaiting review" },
    { command: "lang", description: "Switch language" },
    { command: "help", description: "Show help message" },
  ]);

  // Set Russian commands
  await bot.api.setMyCommands(
    [
      { command: "start", description: "Приветствие и помощь" },
      { command: "login", description: "Инструкции по входу" },
      { command: "status", description: "Обзор ваших каналов" },
      { command: "channels", description: "Список ваших каналов" },
      { command: "pending", description: "Посты на проверку" },
      { command: "lang", description: "Сменить язык" },
      { command: "help", description: "Показать справку" },
    ],
    { language_code: "ru" }
  );
}
