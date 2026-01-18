import { prisma } from "@repo/database";
import { sendMessage, sendPhoto, sendMediaGroup, getBot } from "@repo/telegram/bot";
import type { PublishingJobPayload } from "@repo/shared/queues";

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
      if (post.mediaFiles.length === 1) {
        // Single image
        const result = await bot.api.sendPhoto(channelTelegramId, post.mediaFiles[0]!.url, {
          caption: post.content,
          parse_mode: "HTML",
        });
        telegramMessageId = result.message_id;
      } else {
        // Multiple images (media group)
        const media = post.mediaFiles.map((file, index) => ({
          type: "photo" as const,
          media: file.url,
          caption: index === 0 ? post.content : undefined,
          parse_mode: "HTML" as const,
        }));
        const results = await bot.api.sendMediaGroup(channelTelegramId, media);
        telegramMessageId = results[0]?.message_id;
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
