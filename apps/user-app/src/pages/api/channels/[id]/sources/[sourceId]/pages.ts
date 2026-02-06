import type { NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";

interface WebsitePageResponse {
  id: string;
  url: string;
  path: string | null;
  title: string | null;
  status: string;
  relevanceScore: number | null;
  contentHash: string | null;
  error: string | null;
  discoveredAt: string;
  lastScrapedAt: string | null;
}

interface PaginatedPages {
  pages: WebsitePageResponse[];
  total: number;
  page: number;
  pageSize: number;
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<PaginatedPages>>
) {
  if (req.method !== "GET") {
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
    where: { id: sourceId, channelId, sourceType: "website" },
  });

  if (!source) {
    return res.status(404).json({ success: false, error: "Source not found" });
  }

  const page = parseInt(req.query.page as string, 10) || 1;
  const pageSize = parseInt(req.query.pageSize as string, 10) || 20;
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;

  const where: Record<string, unknown> = { sourceId };
  if (status && status !== "all") {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { url: { contains: search, mode: "insensitive" } },
      { title: { contains: search, mode: "insensitive" } },
    ];
  }

  const [pages, total] = await Promise.all([
    prisma.websitePage.findMany({
      where,
      orderBy: { discoveredAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.websitePage.count({ where }),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      pages: pages.map((p) => ({
        id: p.id,
        url: p.url,
        path: p.path,
        title: p.title,
        status: p.status,
        relevanceScore: p.relevanceScore,
        contentHash: p.contentHash,
        error: p.error,
        discoveredAt: p.discoveredAt.toISOString(),
        lastScrapedAt: p.lastScrapedAt?.toISOString() ?? null,
      })),
      total,
      page,
      pageSize,
    },
  });
}

export default withAuth(handler);
