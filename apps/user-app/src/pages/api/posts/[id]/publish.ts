import type { NextApiResponse } from "next";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";
import { QUEUE_NAMES, PUBLISHING_JOB_OPTIONS, type PublishingJobPayload } from "@repo/shared/queues";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const publishQueue = new Queue<PublishingJobPayload>(QUEUE_NAMES.PUBLISHING, {
  connection: redis,
});

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { user } = req;
  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ success: false, error: "Invalid post ID" });
  }

  // Get the post and verify ownership
  const post = await prisma.post.findFirst({
    where: {
      id,
      channel: { userId: user.id },
    },
    include: { channel: true },
  });

  if (!post) {
    return res.status(404).json({ success: false, error: "Post not found" });
  }

  // Can only publish drafts or reschedule failed posts
  if (!["draft", "failed"].includes(post.status)) {
    return res.status(400).json({
      success: false,
      error: "Cannot publish a post that is not a draft or failed",
    });
  }

  // Update status to publishing
  await prisma.post.update({
    where: { id },
    data: { status: "publishing" },
  });

  // Add to publishing queue
  await publishQueue.add(
    "publish",
    {
      postId: post.id,
      channelTelegramId: post.channel.telegramId.toString(),
    },
    PUBLISHING_JOB_OPTIONS
  );

  return res.status(200).json({
    success: true,
    message: "Post queued for publishing",
  });
}

export default withAuth(handler);
