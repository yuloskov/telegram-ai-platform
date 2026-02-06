import type { NextApiResponse } from "next";
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";
import {
  QUEUE_NAMES,
  WEBPAGE_PARSING_JOB_OPTIONS,
  DOCUMENT_PARSING_JOB_OPTIONS,
  WEBSITE_CRAWL_JOB_OPTIONS,
} from "@repo/shared/queues";

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<{ message: string }>>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { user } = req;
  const { id: channelId, sourceId } = req.query;

  if (typeof channelId !== "string" || typeof sourceId !== "string") {
    return res.status(400).json({ success: false, error: "Invalid parameters" });
  }

  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: user.id },
  });

  if (!channel) {
    return res.status(404).json({ success: false, error: "Channel not found" });
  }

  const source = await prisma.contentSource.findFirst({
    where: { id: sourceId, channelId },
  });

  if (!source) {
    return res.status(404).json({ success: false, error: "Source not found" });
  }

  if (!["webpage", "document", "website"].includes(source.sourceType)) {
    return res.status(400).json({
      success: false,
      error: "Only webpage, document, and website sources can be refreshed",
    });
  }

  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

  if (source.sourceType === "website") {
    if (!source.websiteUrl) {
      return res.status(400).json({ success: false, error: "Source has no URL" });
    }

    const isFullRecrawl = req.body?.fullRecrawl === true;
    const queue = new Queue(QUEUE_NAMES.WEBSITE_CRAWL, { connection });
    await queue.add(
      "crawl-website",
      {
        sourceId: source.id,
        websiteUrl: source.websiteUrl,
        isIncremental: !isFullRecrawl,
      },
      WEBSITE_CRAWL_JOB_OPTIONS
    );
    await queue.close();
  } else if (source.sourceType === "webpage") {
    if (!source.webpageUrl) {
      return res.status(400).json({ success: false, error: "Source has no URL" });
    }

    const queue = new Queue(QUEUE_NAMES.WEBPAGE_PARSING, { connection });
    await queue.add(
      "parse-webpage",
      { sourceId: source.id, webpageUrl: source.webpageUrl },
      WEBPAGE_PARSING_JOB_OPTIONS
    );
    await queue.close();
  } else {
    if (!source.documentUrl) {
      return res.status(400).json({ success: false, error: "Source has no document" });
    }

    const queue = new Queue(QUEUE_NAMES.DOCUMENT_PARSING, { connection });
    await queue.add(
      "parse-document",
      { sourceId: source.id, documentUrl: source.documentUrl },
      DOCUMENT_PARSING_JOB_OPTIONS
    );
    await queue.close();
  }

  await connection.quit();

  return res.status(200).json({
    success: true,
    data: { message: "Refresh job queued" },
  });
}

export default withAuth(handler);
