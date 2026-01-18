import { Bot, Context, session, SessionFlavor } from "grammy";

interface SessionData {
  language: string;
  pendingAuthCode?: string;
}

export type BotContext = Context & SessionFlavor<SessionData>;

let botInstance: Bot<BotContext> | null = null;

export function createBot(token?: string): Bot<BotContext> {
  const botToken = token ?? process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN environment variable is not set");
  }

  const bot = new Bot<BotContext>(botToken);

  bot.use(
    session({
      initial: (): SessionData => ({
        language: "en",
      }),
    })
  );

  return bot;
}

export function getBot(): Bot<BotContext> {
  if (!botInstance) {
    botInstance = createBot();
  }
  return botInstance;
}

export async function sendMessage(
  chatId: number | string,
  text: string,
  options?: {
    parseMode?: "HTML" | "Markdown" | "MarkdownV2";
    replyMarkup?: Parameters<Bot["api"]["sendMessage"]>[2]["reply_markup"];
  }
): Promise<void> {
  const bot = getBot();
  await bot.api.sendMessage(chatId, text, {
    parse_mode: options?.parseMode ?? "HTML",
    reply_markup: options?.replyMarkup,
  });
}

export async function sendPhoto(
  chatId: number | string,
  photo: string | Buffer,
  options?: {
    caption?: string;
    parseMode?: "HTML" | "Markdown" | "MarkdownV2";
  }
): Promise<void> {
  const bot = getBot();
  await bot.api.sendPhoto(chatId, photo, {
    caption: options?.caption,
    parse_mode: options?.parseMode ?? "HTML",
  });
}

export async function sendMediaGroup(
  chatId: number | string,
  media: Array<{
    type: "photo" | "video";
    media: string;
    caption?: string;
  }>
): Promise<void> {
  const bot = getBot();
  await bot.api.sendMediaGroup(
    chatId,
    media.map((m, index) => ({
      type: m.type,
      media: m.media,
      caption: index === 0 ? m.caption : undefined,
      parse_mode: "HTML" as const,
    }))
  );
}

export async function verifyBotPermissions(
  channelId: number | string
): Promise<{
  canPost: boolean;
  canEditMessages: boolean;
  canDeleteMessages: boolean;
  error?: string;
}> {
  try {
    const bot = getBot();
    // Always initialize bot to get botInfo (Grammy throws if accessed before init)
    await bot.init();
    const chatMember = await bot.api.getChatMember(channelId, bot.botInfo.id);

    console.log("Chat member response:", JSON.stringify(chatMember, null, 2));

    const isAdmin =
      chatMember.status === "administrator" || chatMember.status === "creator";

    if (!isAdmin) {
      return {
        canPost: false,
        canEditMessages: false,
        canDeleteMessages: false,
        error: "Bot is not an administrator of this channel",
      };
    }

    // For administrators, check the specific permission
    // Note: can_post_messages might be undefined if not explicitly set
    let canPost = false;
    if (chatMember.status === "creator") {
      canPost = true;
    } else if (chatMember.status === "administrator") {
      // If can_post_messages is undefined, it might mean the permission wasn't explicitly granted
      // But in channels, admins typically need this permission explicitly
      canPost = chatMember.can_post_messages === true;
    }

    let canEditMessages = false;
    if (chatMember.status === "creator") {
      canEditMessages = true;
    } else if (chatMember.status === "administrator") {
      canEditMessages = chatMember.can_edit_messages === true;
    }

    let canDeleteMessages = false;
    if (chatMember.status === "creator") {
      canDeleteMessages = true;
    } else if (chatMember.status === "administrator") {
      canDeleteMessages = chatMember.can_delete_messages === true;
    }

    console.log("Permissions:", { canPost, canEditMessages, canDeleteMessages });

    return {
      canPost,
      canEditMessages,
      canDeleteMessages,
    };
  } catch (error) {
    console.error("Error verifying bot permissions:", error);
    return {
      canPost: false,
      canEditMessages: false,
      canDeleteMessages: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getChannelInfo(channelId: number | string): Promise<{
  id: number;
  title: string;
  username?: string;
  type: string;
} | null> {
  try {
    const bot = getBot();
    const chat = await bot.api.getChat(channelId);

    if (chat.type !== "channel") {
      return null;
    }

    return {
      id: chat.id,
      title: chat.title,
      username: chat.username,
      type: chat.type,
    };
  } catch {
    return null;
  }
}

export { setupBot, setCommands } from "./setup";
export { Bot, Context } from "grammy";
export type { BotContext, SessionData };
