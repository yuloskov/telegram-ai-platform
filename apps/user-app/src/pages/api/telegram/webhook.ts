import type { NextApiRequest, NextApiResponse } from "next";
import { createBot, setupBot } from "@repo/telegram-bot";
import { webhookCallback } from "grammy";

// Create and setup bot
const bot = createBot();
setupBot(bot);

// Initialize bot info
let botInitialized = false;
async function ensureBotInitialized() {
  if (!botInitialized) {
    await bot.init();
    botInitialized = true;
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await ensureBotInitialized();
    const handleUpdate = webhookCallback(bot, "next-js");
    return handleUpdate(req, res);
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
