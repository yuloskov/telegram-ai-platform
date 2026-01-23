// API route helpers for ownership verification and common patterns

import type { NextApiResponse } from "next";
import { prisma } from "@repo/database";

interface OwnershipCheckResult {
  success: boolean;
  error?: string;
  channel?: {
    id: string;
    userId: string;
    telegramId: bigint;
    username: string | null;
    title: string;
  };
  source?: {
    id: string;
    channelId: string;
    telegramUsername: string | null;
  };
  post?: {
    id: string;
    channelId: string;
    content: string;
  };
}

/**
 * Verify user owns a channel.
 * Returns the channel if ownership is verified, or sends an error response.
 */
export async function requireChannelOwnership(
  userId: string,
  channelId: string,
  res: NextApiResponse
): Promise<OwnershipCheckResult> {
  const channel = await prisma.channel.findFirst({
    where: {
      id: channelId,
      userId,
    },
    select: {
      id: true,
      userId: true,
      telegramId: true,
      username: true,
      title: true,
    },
  });

  if (!channel) {
    res.status(404).json({ success: false, error: "Channel not found" });
    return { success: false, error: "Channel not found" };
  }

  return { success: true, channel };
}

/**
 * Verify user owns a source (through channel ownership).
 * Returns the source and channel if ownership is verified.
 */
export async function requireSourceOwnership(
  userId: string,
  channelId: string,
  sourceId: string,
  res: NextApiResponse
): Promise<OwnershipCheckResult> {
  // First verify channel ownership
  const channelResult = await requireChannelOwnership(userId, channelId, res);
  if (!channelResult.success) {
    return channelResult;
  }

  const source = await prisma.contentSource.findFirst({
    where: {
      id: sourceId,
      channelId,
    },
    select: {
      id: true,
      channelId: true,
      telegramUsername: true,
    },
  });

  if (!source) {
    res.status(404).json({ success: false, error: "Source not found" });
    return { success: false, error: "Source not found" };
  }

  return { success: true, channel: channelResult.channel, source };
}

/**
 * Verify user owns a post (through channel ownership).
 * Returns the post and channel if ownership is verified.
 */
export async function requirePostOwnership(
  userId: string,
  postId: string,
  res: NextApiResponse
): Promise<OwnershipCheckResult> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      channel: {
        select: {
          id: true,
          userId: true,
          telegramId: true,
          username: true,
          title: true,
        },
      },
    },
  });

  if (!post || post.channel.userId !== userId) {
    res.status(404).json({ success: false, error: "Post not found" });
    return { success: false, error: "Post not found" };
  }

  return {
    success: true,
    channel: post.channel,
    post: {
      id: post.id,
      channelId: post.channelId,
      content: post.content,
    },
  };
}

/**
 * Standard API success response helper.
 */
export function successResponse<T>(res: NextApiResponse, data: T) {
  return res.status(200).json({ success: true, data });
}

/**
 * Standard API error response helper.
 */
export function errorResponse(
  res: NextApiResponse,
  error: string,
  status = 400
) {
  return res.status(status).json({ success: false, error });
}
