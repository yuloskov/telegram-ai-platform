import type { NextApiResponse } from "next";
import { z } from "zod";
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

const BulkPublishSchema = z.object({
  postIds: z.array(z.string()).min(1),
});

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<{ queued: number }>>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { user } = req;

  const parseResult = BulkPublishSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: parseResult.error.errors[0]?.message ?? "Validation error",
    });
  }

  const { postIds } = parseResult.data;

  // Find all posts that belong to user and can be published (draft or failed)
  const posts = await prisma.post.findMany({
    where: {
      id: { in: postIds },
      status: { in: ["draft", "failed"] },
      channel: { userId: user.id },
    },
    include: { channel: true },
  });

  if (posts.length === 0) {
    return res.status(400).json({
      success: false,
      error: "No publishable posts found (only drafts and failed posts can be published)",
    });
  }

  const idsToPublish = posts.map((p) => p.id);

  // Update all posts to publishing status
  await prisma.post.updateMany({
    where: { id: { in: idsToPublish } },
    data: { status: "publishing" },
  });

  // Add each post to the publishing queue
  for (const post of posts) {
    await publishQueue.add(
      "publish",
      {
        postId: post.id,
        channelTelegramId: post.channel.telegramId.toString(),
      },
      PUBLISHING_JOB_OPTIONS
    );
  }

  return res.status(200).json({
    success: true,
    data: { queued: posts.length },
  });
}

export default withAuth(handler);
