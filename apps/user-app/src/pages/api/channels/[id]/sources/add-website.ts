import type { NextApiResponse } from "next";
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { z } from "zod";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";
import { QUEUE_NAMES, WEBSITE_CRAWL_JOB_OPTIONS } from "@repo/shared/queues";

const AddWebsiteSchema = z.object({
  url: z.string().url("Invalid URL format"),
  maxPages: z.number().int().min(1).max(500).optional().default(50),
  stalenessDays: z.number().int().min(1).max(365).optional().default(30),
  filterPatterns: z.array(z.string()).optional().default([]),
  skipChunking: z.boolean().optional().default(false),
});

interface WebsiteSourceResponse {
  id: string;
  sourceType: "website";
  websiteUrl: string;
  websiteDomain: string | null;
  websiteMaxPages: number;
  websiteStalenessDays: number;
  isActive: boolean;
  createdAt: string;
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<WebsiteSourceResponse>>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { user } = req;
  const { id: channelId } = req.query;

  if (typeof channelId !== "string") {
    return res.status(400).json({ success: false, error: "Invalid channel ID" });
  }

  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: user.id },
  });

  if (!channel) {
    return res.status(404).json({ success: false, error: "Channel not found" });
  }

  const parseResult = AddWebsiteSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: parseResult.error.errors[0]?.message ?? "Invalid request",
    });
  }

  const { url, maxPages, stalenessDays, filterPatterns, skipChunking } = parseResult.data;

  // Validate URL protocol
  try {
    const parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return res.status(400).json({
        success: false,
        error: "Only HTTP and HTTPS URLs are allowed",
      });
    }
  } catch {
    return res.status(400).json({ success: false, error: "Invalid URL format" });
  }

  // Check for duplicate
  const existingSource = await prisma.contentSource.findFirst({
    where: { channelId, sourceType: "website", websiteUrl: url },
  });

  if (existingSource) {
    return res.status(400).json({
      success: false,
      error: "This website is already added to your channel",
    });
  }

  const domain = new URL(url).hostname.replace(/^www\./, "");

  const source = await prisma.contentSource.create({
    data: {
      channelId,
      sourceType: "website",
      websiteUrl: url,
      websiteDomain: domain,
      websiteMaxPages: maxPages,
      websiteStalenessDays: stalenessDays,
      websiteFilterPatterns: filterPatterns,
      websiteCrawlStatus: "idle",
      skipChunking,
    },
  });

  // Queue crawl job
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue(QUEUE_NAMES.WEBSITE_CRAWL, { connection });

  await queue.add(
    "crawl-website",
    { sourceId: source.id, websiteUrl: url, isIncremental: false },
    WEBSITE_CRAWL_JOB_OPTIONS
  );

  await queue.close();
  await connection.quit();

  return res.status(201).json({
    success: true,
    data: {
      id: source.id,
      sourceType: "website",
      websiteUrl: source.websiteUrl!,
      websiteDomain: source.websiteDomain,
      websiteMaxPages: source.websiteMaxPages,
      websiteStalenessDays: source.websiteStalenessDays,
      isActive: source.isActive,
      createdAt: source.createdAt.toISOString(),
    },
  });
}

export default withAuth(handler);
