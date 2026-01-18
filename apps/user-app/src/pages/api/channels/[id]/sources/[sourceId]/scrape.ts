import type { NextApiResponse } from "next";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";
import { QUEUE_NAMES, SCRAPING_JOB_OPTIONS, type ScrapingJobPayload } from "@repo/shared/queues";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const scrapingQueue = new Queue<ScrapingJobPayload>(QUEUE_NAMES.SCRAPING, {
  connection: redis,
});

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<{ jobId: string }>>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { user } = req;
  const { id: channelId, sourceId } = req.query;

  if (typeof channelId !== "string" || typeof sourceId !== "string") {
    return res.status(400).json({ success: false, error: "Invalid IDs" });
  }

  // Verify channel ownership
  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: user.id },
  });

  if (!channel) {
    return res.status(404).json({ success: false, error: "Channel not found" });
  }

  // Verify source belongs to channel
  const source = await prisma.contentSource.findFirst({
    where: { id: sourceId, channelId },
  });

  if (!source) {
    return res.status(404).json({ success: false, error: "Source not found" });
  }

  // Add to scraping queue
  const job = await scrapingQueue.add(
    "scrape",
    { sourceId: source.id },
    SCRAPING_JOB_OPTIONS
  );

  return res.status(200).json({
    success: true,
    data: { jobId: job.id ?? "" },
    message: "Scrape job started",
  });
}

export default withAuth(handler);
