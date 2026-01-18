import { sendMessage } from "@repo/telegram/bot";
import type { NotificationJobPayload } from "@repo/shared/queues";

export async function handleNotificationJob(data: NotificationJobPayload): Promise<void> {
  const { telegramId, title, message, type } = data;

  const formattedMessage = `<b>${title}</b>\n\n${message}`;

  await sendMessage(telegramId, formattedMessage, {
    parseMode: "HTML",
  });

  console.log(`Notification sent to ${telegramId}: ${type}`);
}
