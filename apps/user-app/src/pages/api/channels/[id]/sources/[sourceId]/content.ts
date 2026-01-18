import type { NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { PaginatedResponse } from "@repo/shared/types";

interface ScrapedContentResponse {
  id: string;
  telegramMessageId: string;
  text: string | null;
  mediaUrls: string[];
  views: number;
  forwards: number;
  reactions: number;
  scrapedAt: string;
  usedForGeneration: boolean;
  imageAnalysis: {
    subject: string | null;
    style: string | null;
    mood: string | null;
  } | null;
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<PaginatedResponse<ScrapedContentResponse>>
) {
  const { user } = req;
  const { id: channelId, sourceId, page = "1", limit = "20", usedForGeneration } = req.query;

  if (typeof channelId !== "string" || typeof sourceId !== "string") {
    return res.status(400).json({
      success: false,
      error: "Invalid IDs",
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
  }

  // Verify channel ownership
  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: user.id },
  });

  if (!channel) {
    return res.status(404).json({
      success: false,
      error: "Channel not found",
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
  }

  // Verify source belongs to channel
  const source = await prisma.contentSource.findFirst({
    where: { id: sourceId, channelId },
  });

  if (!source) {
    return res.status(404).json({
      success: false,
      error: "Source not found",
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
  }

  if (req.method === "GET") {
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = { sourceId };
    if (usedForGeneration === "true") {
      where.usedForGeneration = true;
    } else if (usedForGeneration === "false") {
      where.usedForGeneration = false;
    }

    const [content, total] = await Promise.all([
      prisma.scrapedContent.findMany({
        where,
        include: {
          imageAnalysis: {
            select: {
              subject: true,
              style: true,
              mood: true,
            },
          },
        },
        orderBy: { scrapedAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.scrapedContent.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: content.map((item) => ({
        id: item.id,
        telegramMessageId: item.telegramMessageId.toString(),
        text: item.text,
        mediaUrls: item.mediaUrls,
        views: item.views,
        forwards: item.forwards,
        reactions: item.reactions,
        scrapedAt: item.scrapedAt.toISOString(),
        usedForGeneration: item.usedForGeneration,
        imageAnalysis: item.imageAnalysis,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  }

  return res.status(405).json({
    success: false,
    error: "Method not allowed",
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  });
}

export default withAuth(handler);
