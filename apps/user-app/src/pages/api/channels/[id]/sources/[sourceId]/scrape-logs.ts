import type { NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { PaginatedResponse } from "@repo/shared/types";

interface ScrapeLogResponse {
  id: string;
  status: string;
  postsFound: number;
  newPosts: number;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<PaginatedResponse<ScrapeLogResponse>>
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });
  }

  const { user } = req;
  const { id: channelId, sourceId, page = "1", limit = "10" } = req.query;

  if (typeof channelId !== "string" || typeof sourceId !== "string") {
    return res.status(400).json({
      success: false,
      error: "Invalid IDs",
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
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
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
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
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });
  }

  const pageNum = Math.max(1, parseInt(page as string, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [logs, total] = await Promise.all([
    prisma.scrapeLog.findMany({
      where: { sourceId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limitNum,
    }),
    prisma.scrapeLog.count({ where: { sourceId } }),
  ]);

  return res.status(200).json({
    success: true,
    data: logs.map((log) => ({
      id: log.id,
      status: log.status,
      postsFound: log.postsFound,
      newPosts: log.newPosts,
      error: log.error,
      startedAt: log.startedAt?.toISOString() ?? null,
      completedAt: log.completedAt?.toISOString() ?? null,
      createdAt: log.createdAt.toISOString(),
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
}

export default withAuth(handler);
