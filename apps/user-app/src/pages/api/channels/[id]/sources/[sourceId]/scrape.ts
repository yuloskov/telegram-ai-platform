import type { NextApiResponse } from "next";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";
import { QUEUE_NAMES, SCRAPING_JOB_OPTIONS, type ScrapingJobPayload } from "@repo/shared/queues";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

// Use a singleton pattern to avoid multiple connections in dev mode
const globalForRedis = globalThis as unknown as { scrapingRedis?: Redis; scrapingQueue?: Queue<ScrapingJobPayload> };

if (!globalForRedis.scrapingRedis) {
  globalForRedis.scrapingRedis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });
}

if (!globalForRedis.scrapingQueue) {
  globalForRedis.scrapingQueue = new Queue<ScrapingJobPayload>(QUEUE_NAMES.SCRAPING, {
    connection: globalForRedis.scrapingRedis,
  });
}

const scrapingQueue = globalForRedis.scrapingQueue;

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

  // Check if there's already a pending or running job for this source
  const existingJob = await prisma.jobLog.findFirst({
    where: {
      jobType: "scraping",
      status: { in: ["pending", "running"] },
      payload: { path: ["sourceId"], equals: source.id },
    },
  });

  if (existingJob) {
    return res.status(200).json({
      success: true,
      data: { jobId: existingJob.jobId },
      message: "Scrape job already in progress",
    });
  }

  try {
    // Add to scraping queue
    const job = await scrapingQueue.add(
      "scrape",
      { sourceId: source.id },
      SCRAPING_JOB_OPTIONS
    );

    // Log job to database for admin dashboard
    await prisma.jobLog.create({
      data: {
        jobId: job.id ?? `scrape-${source.id}-${Date.now()}`,
        jobType: "scraping",
        status: "pending",
        payload: { sourceId: source.id },
      },
    });

    return res.status(200).json({
      success: true,
      data: { jobId: job.id ?? "" },
      message: "Scrape job started",
    });
  } catch (error) {
    console.error("[scrape] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create scrape job",
    });
  }
}

export default withAuth(handler);
