import type { NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { PaginatedResponse } from "@repo/shared/types";

interface ScrapedContentResponse {
  id: string;
  telegramMessageId: string | null;
  chunkIndex: number | null;
  sectionTitle: string | null;
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
  const {
    id: channelId,
    sourceId,
    page = "1",
    limit = "20",
    usedForGeneration,
    search,
    sortBy = "date",
    sortOrder = "desc",
    dateRange,
  } = req.query;

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

    // Build where clause
    const where: Record<string, unknown> = { sourceId };
    if (usedForGeneration === "true") {
      where.usedForGeneration = true;
    } else if (usedForGeneration === "false") {
      where.usedForGeneration = false;
    }

    // Search filter
    if (search && typeof search === "string" && search.trim()) {
      where.text = {
        contains: search.trim(),
        mode: "insensitive",
      };
    }

    // Date range filter
    if (dateRange && typeof dateRange === "string") {
      const now = new Date();
      if (dateRange === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        where.scrapedAt = { gte: weekAgo };
      } else if (dateRange === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        where.scrapedAt = { gte: monthAgo };
      }
    }

    // Build orderBy clause
    // For telegram sources, use telegramMessageId (sequential IDs)
    // For document sources, use chunkIndex
    const isDocument = source.sourceType === "document";
    type OrderByField = "telegramMessageId" | "chunkIndex" | "views" | "forwards";
    const sortField: OrderByField =
      sortBy === "views" ? "views" :
      sortBy === "forwards" ? "forwards" :
      isDocument ? "chunkIndex" : "telegramMessageId";
    // Documents default to ascending order (chunk 1, 2, 3...)
    const sortDirection = sortOrder === "asc" ? "asc" : isDocument && sortBy === "date" ? "asc" : "desc";
    const orderBy = { [sortField]: sortDirection };

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
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.scrapedContent.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: content.map((item) => ({
        id: item.id,
        telegramMessageId: item.telegramMessageId?.toString() ?? null,
        chunkIndex: item.chunkIndex,
        sectionTitle: item.sectionTitle,
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
