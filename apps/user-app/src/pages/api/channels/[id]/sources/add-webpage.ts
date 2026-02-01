import type { NextApiResponse } from "next";
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { z } from "zod";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";
import { QUEUE_NAMES, WEBPAGE_PARSING_JOB_OPTIONS } from "@repo/shared/queues";

const AddWebpageSchema = z.object({
  url: z.string().url("Invalid URL format"),
});

interface WebpageSourceResponse {
  id: string;
  sourceType: "webpage";
  webpageUrl: string;
  webpageTitle: string | null;
  webpageDomain: string | null;
  isActive: boolean;
  lastScrapedAt: string | null;
  createdAt: string;
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<WebpageSourceResponse>>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { user } = req;
  const { id: channelId } = req.query;

  if (typeof channelId !== "string") {
    return res.status(400).json({ success: false, error: "Invalid channel ID" });
  }

  // Verify channel ownership
  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: user.id },
  });

  if (!channel) {
    return res.status(404).json({ success: false, error: "Channel not found" });
  }

  const parseResult = AddWebpageSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: parseResult.error.errors[0]?.message ?? "Invalid request",
    });
  }

  const { url } = parseResult.data;

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
    return res.status(400).json({
      success: false,
      error: "Invalid URL format",
    });
  }

  // Check for duplicate URL in this channel
  const existingSource = await prisma.contentSource.findFirst({
    where: {
      channelId,
      sourceType: "webpage",
      webpageUrl: url,
    },
  });

  if (existingSource) {
    return res.status(400).json({
      success: false,
      error: "This webpage is already added to your channel",
    });
  }

  // Extract domain for display
  const domain = new URL(url).hostname.replace(/^www\./, "");

  // Create the source
  const source = await prisma.contentSource.create({
    data: {
      channelId,
      sourceType: "webpage",
      webpageUrl: url,
      webpageDomain: domain,
    },
  });

  // Queue the parsing job
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue(QUEUE_NAMES.WEBPAGE_PARSING, { connection });

  await queue.add(
    "parse-webpage",
    { sourceId: source.id, webpageUrl: url },
    WEBPAGE_PARSING_JOB_OPTIONS
  );

  await queue.close();
  await connection.quit();

  return res.status(201).json({
    success: true,
    data: {
      id: source.id,
      sourceType: "webpage",
      webpageUrl: source.webpageUrl!,
      webpageTitle: source.webpageTitle,
      webpageDomain: source.webpageDomain,
      isActive: source.isActive,
      lastScrapedAt: source.lastScrapedAt?.toISOString() ?? null,
      createdAt: source.createdAt.toISOString(),
    },
  });
}

export default withAuth(handler);
