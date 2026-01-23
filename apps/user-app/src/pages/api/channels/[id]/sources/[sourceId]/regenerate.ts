import type { NextApiResponse } from "next";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";
import {
  QUEUE_NAMES,
  DOCUMENT_PARSING_JOB_OPTIONS,
  type DocumentParsingJobPayload,
} from "@repo/shared/queues";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

// Use a singleton pattern to avoid multiple connections in dev mode
const globalForRedis = globalThis as unknown as {
  documentParsingRedis?: Redis;
  documentParsingQueue?: Queue<DocumentParsingJobPayload>;
};

if (!globalForRedis.documentParsingRedis) {
  globalForRedis.documentParsingRedis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });
}

if (!globalForRedis.documentParsingQueue) {
  globalForRedis.documentParsingQueue = new Queue<DocumentParsingJobPayload>(
    QUEUE_NAMES.DOCUMENT_PARSING,
    { connection: globalForRedis.documentParsingRedis }
  );
}

const documentParsingQueue = globalForRedis.documentParsingQueue;

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

  // Verify source belongs to channel and is a document
  const source = await prisma.contentSource.findFirst({
    where: { id: sourceId, channelId },
  });

  if (!source) {
    return res.status(404).json({ success: false, error: "Source not found" });
  }

  if (source.sourceType !== "document") {
    return res.status(400).json({
      success: false,
      error: "Can only regenerate document sources",
    });
  }

  if (!source.documentUrl) {
    return res.status(400).json({
      success: false,
      error: "Document URL not found",
    });
  }

  // Check if there's already a pending or running job for this source
  const existingJob = await prisma.jobLog.findFirst({
    where: {
      jobType: "document-parsing",
      status: { in: ["pending", "running"] },
      payload: { path: ["sourceId"], equals: source.id },
    },
  });

  if (existingJob) {
    return res.status(200).json({
      success: true,
      data: { jobId: existingJob.jobId },
      message: "Regeneration job already in progress",
    });
  }

  try {
    // Delete existing chunks
    await prisma.scrapedContent.deleteMany({
      where: { sourceId: source.id },
    });

    // Reset lastScrapedAt to indicate processing
    await prisma.contentSource.update({
      where: { id: source.id },
      data: { lastScrapedAt: null },
    });

    // Add to document parsing queue
    const job = await documentParsingQueue.add(
      "parse-document",
      {
        sourceId: source.id,
        documentUrl: source.documentUrl,
      },
      DOCUMENT_PARSING_JOB_OPTIONS
    );

    // Log job to database
    await prisma.jobLog.create({
      data: {
        jobId: job.id ?? `doc-parse-${source.id}-${Date.now()}`,
        jobType: "document-parsing",
        status: "pending",
        payload: { sourceId: source.id, documentUrl: source.documentUrl },
      },
    });

    return res.status(200).json({
      success: true,
      data: { jobId: job.id ?? "" },
      message: "Regeneration started",
    });
  } catch (error) {
    console.error("[regenerate] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to start regeneration",
    });
  }
}

export default withAuth(handler);
