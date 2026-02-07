import { Bot, Context, session, InputFile } from "grammy";
import type { SessionFlavor } from "grammy";

export interface ReviewEditState {
  postId: string;
  channelId: string;
  contentPlanId?: string;
  originalContent: string;
  currentContent: string;
  imageUrl?: string;
  awaitingInput: "text_edit" | "image_feedback" | null;
  /** Message ID of the review message for in-place editing */
  originalMessageId?: number;
  /** Chat ID for editing the message when not in callback context */
  chatId?: number;
}

interface SessionData {
  language: string;
  pendingAuthCode?: string;
  reviewEditState?: ReviewEditState;
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
    replyMarkup?: unknown;
  }
): Promise<void> {
  const bot = getBot();
  await bot.api.sendMessage(chatId, text, {
    parse_mode: options?.parseMode ?? "HTML",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reply_markup: options?.replyMarkup as any,
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
  const photoInput = typeof photo === "string" ? photo : new InputFile(photo);
  await bot.api.sendPhoto(chatId, photoInput, {
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

/**
 * Close any unclosed HTML tags after truncation.
 * Removes partial tags at the end, then closes remaining open tags.
 */
function closeTruncatedHtml(html: string): string {
  // Remove any partial tag at the end (e.g., "<b" or "</b" without ">")
  const cleaned = html.replace(/<[^>]*$/, "");

  const openTags: string[] = [];
  const tagRegex = /<\/?([a-zA-Z]+)[^>]*>/g;
  let match;

  while ((match = tagRegex.exec(cleaned)) !== null) {
    const isClosing = match[0].startsWith("</");
    const tagName = match[1]!.toLowerCase();

    if (isClosing) {
      const idx = openTags.lastIndexOf(tagName);
      if (idx !== -1) openTags.splice(idx, 1);
    } else if (!match[0].endsWith("/>")) {
      openTags.push(tagName);
    }
  }

  return cleaned + "..." + openTags.reverse().map((t) => `</${t}>`).join("");
}

/**
 * Send a pending review notification to a user with action buttons
 * Returns the message ID for storing in PendingReview
 */
export async function sendPendingReviewNotification(
  telegramId: string | number,
  postId: string,
  channelTitle: string,
  content: string,
  language: "en" | "ru" = "en",
  imageBuffer?: Buffer
): Promise<number> {
  const bot = getBot();

  const labels =
    language === "ru"
      ? {
          title: "📋 Новый пост для проверки",
          channel: "Канал",
          content: "Содержимое поста",
          approve: "Одобрить",
          reject: "Отклонить",
          edit: "Редактировать",
          schedule: "Запланировать",
        }
      : {
          title: "📋 New post for review",
          channel: "Channel",
          content: "Post content",
          approve: "Approve",
          reject: "Reject",
          edit: "Edit",
          schedule: "Schedule",
        };

  const keyboard = {
    inline_keyboard: [
      [
        { text: labels.approve, callback_data: `review:approve:${postId}` },
        { text: labels.reject, callback_data: `review:reject:${postId}` },
      ],
      [
        { text: labels.edit, callback_data: `review:edit:${postId}` },
        { text: labels.schedule, callback_data: `review:schedule:${postId}` },
      ],
    ],
  };

  console.log(`[v2] sendPendingReviewNotification called with imageBuffer: ${imageBuffer ? `${imageBuffer.length} bytes` : 'undefined'}, content length: ${content.length}`);

  // Build header with clear structure
  const buildMessage = (maxTotal: number) => {
    const header = `<b>${labels.title}</b>\n📢 <b>${labels.channel}:</b> ${channelTitle}\n\n<b>${labels.content}:</b>\n────────────────\n`;
    const maxContentLength = maxTotal - header.length - 20; // Reserve space for "..." and closing tags
    const truncatedContent = content.length > maxContentLength
      ? closeTruncatedHtml(content.substring(0, maxContentLength))
      : content;
    return `${header}${truncatedContent}`;
  };

  // If there's an image, send as photo with caption (limited to 1024 chars)
  if (imageBuffer) {
    const caption = buildMessage(1024);

    const result = await bot.api.sendPhoto(telegramId, new InputFile(imageBuffer), {
      caption,
      parse_mode: "HTML",
      reply_markup: keyboard,
    });

    return result.message_id;
  }

  // No image - send as text message (up to 4096 chars)
  const message = buildMessage(4096);

  const result = await bot.api.sendMessage(telegramId, message, {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });

  return result.message_id;
}

export { setupBot, setCommands } from "./setup";
export { Bot, Context } from "grammy";
