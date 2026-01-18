import { createBot, setupBot, setCommands } from "@repo/telegram-bot/bot";

async function main() {
  console.log("Starting Telegram bot in polling mode...");

  const bot = createBot();
  setupBot(bot);

  // Set bot commands in Telegram
  await setCommands(bot);
  console.log("Bot commands registered");

  // Start polling
  bot.start({
    onStart: (botInfo) => {
      console.log(`Bot @${botInfo.username} is running!`);
      console.log("Send a message to the bot to test it.");
    },
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log("Shutting down bot...");
    await bot.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("Failed to start bot:", error);
  process.exit(1);
});
