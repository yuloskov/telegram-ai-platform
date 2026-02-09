import { prisma } from "@repo/database";
import { sendMessage, getBot } from "@repo/telegram-bot/bot";
import { InputFile } from "grammy";
import type { PublishingJobPayload } from "@repo/shared/queues";
import { getFileBuffer } from "@repo/shared/storage";

/**
 * Convert media URL to storage path
 * e.g., "/api/media/telegram-platform/generated/123/456.jpg" -> "telegram-platform/generated/123/456.jpg"
 */
function urlToStoragePath(url: string): string | null {
  const prefix = "/api/media/";
  if (url.startsWith(prefix)) {
    return url.slice(prefix.length);
  }
  return null;
}

/**
 * Fetch media file as InputFile for Telegram upload
 * Fetches from MinIO for local storage paths, or from URL for external URLs
 */
async function getMediaInputFile(url: string, index: number): Promise<InputFile> {
  const storagePath = urlToStoragePath(url);

  if (storagePath) {
    // Local MinIO storage - fetch as buffer
    const parts = storagePath.split("/");
    const bucket = parts[0];
    const objectName = parts.slice(1).join("/");

    if (bucket && objectName) {
      console.log(`Fetching media from MinIO: ${bucket}/${objectName}`);
      const buffer = await getFileBuffer(bucket, objectName);
      // Provide unique filename for each file
      const ext = objectName.split(".").pop() || "jpg";
      return new InputFile(buffer, `image_${index}.${ext}`);
    }
    throw new Error(`Invalid storage path: ${storagePath}`);
  }

  // External URL - fetch it ourselves and upload as buffer
  // This avoids Telegram having to fetch from potentially inaccessible URLs
  console.log(`Fetching media from external URL: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch media from ${url}: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = url.split(".").pop()?.split("?")[0] || "jpg";
  return new InputFile(buffer, `image_${index}.${ext}`);
}

/** Telegram caption limit is 1024 chars; message limit is 4096 */
const CAPTION_LIMIT = 1024;

export async function handlePublishJob(data: PublishingJobPayload): Promise<void> {
  const { postId, channelTelegramId } = data;

  // Get the post with media files
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      mediaFiles: true,
      channel: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!post) {
    throw new Error(`Post not found: ${postId}`);
  }

  if (post.status === "published") {
    console.log(`Post ${postId} already published, skipping`);
    return;
  }

  // Update status to publishing
  await prisma.post.update({
    where: { id: postId },
    data: { status: "publishing" },
  });

  try {
    const bot = getBot();
    let telegramMessageId: number | undefined;

    // If there are media files, send them
    if (post.mediaFiles.length > 0) {
      const captionFits = post.content.length <= CAPTION_LIMIT;

      if (post.mediaFiles.length === 1) {
        // Single image - fetch from storage and upload directly
        const mediaInput = await getMediaInputFile(post.mediaFiles[0]!.url, 0);
        const result = await bot.api.sendPhoto(channelTelegramId, mediaInput, {
          caption: captionFits ? post.content : undefined,
          parse_mode: captionFits ? "HTML" : undefined,
        });
        telegramMessageId = result.message_id;
      } else {
        // Multiple images (media group) - fetch from storage and upload directly
        const media = await Promise.all(
          post.mediaFiles.map(async (file, index) => ({
            type: "photo" as const,
            media: await getMediaInputFile(file.url, index),
            caption: index === 0 && captionFits ? post.content : undefined,
            parse_mode: index === 0 && captionFits ? ("HTML" as const) : undefined,
          }))
        );
        const results = await bot.api.sendMediaGroup(channelTelegramId, media);
        telegramMessageId = results[0]?.message_id;
      }

      // If caption was too long, send text as a separate message (4096 char limit)
      if (!captionFits) {
        const textResult = await bot.api.sendMessage(channelTelegramId, post.content, {
          parse_mode: "HTML",
        });
        telegramMessageId = textResult.message_id;
      }
    } else {
      // Text only
      const result = await bot.api.sendMessage(channelTelegramId, post.content, {
        parse_mode: "HTML",
      });
      telegramMessageId = result.message_id;
    }

    // Update post as published
    await prisma.post.update({
      where: { id: postId },
      data: {
        status: "published",
        publishedAt: new Date(),
        telegramMessageId: telegramMessageId ? BigInt(telegramMessageId) : null,
        errorMessage: null,
      },
    });

    // Send success notification to user
    if (post.channel.user.telegramId) {
      try {
        await sendMessage(
          post.channel.user.telegramId.toString(),
          `Your post has been published to <b>${post.channel.title}</b>!`,
          { parseMode: "HTML" }
        );
      } catch (notifyError) {
        console.error("Failed to send success notification:", notifyError);
      }
    }

    console.log(`Post ${postId} published successfully to channel ${channelTelegramId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Update post as failed
    await prisma.post.update({
      where: { id: postId },
      data: {
        status: "failed",
        errorMessage,
        retryCount: { increment: 1 },
      },
    });

    // Send failure notification to user
    if (post.channel.user.telegramId) {
      try {
        await sendMessage(
          post.channel.user.telegramId.toString(),
          `Failed to publish post to <b>${post.channel.title}</b>:\n\n<code>${errorMessage}</code>`,
          { parseMode: "HTML" }
        );
      } catch (notifyError) {
        console.error("Failed to send failure notification:", notifyError);
      }
    }

    throw error;
  }
}
