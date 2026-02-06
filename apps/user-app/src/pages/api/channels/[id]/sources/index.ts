import type { NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";
import { CreateContentSourceSchema } from "@repo/shared/types";

interface ContentSourceResponse {
  id: string;
  sourceType: "telegram" | "document" | "webpage" | "website";
  telegramUsername: string | null;
  telegramId: string | null;
  documentName: string | null;
  documentUrl: string | null;
  documentMimeType: string | null;
  documentSize: number | null;
  webpageUrl: string | null;
  webpageTitle: string | null;
  webpageDomain: string | null;
  webpageError: string | null;
  websiteUrl: string | null;
  websiteTitle: string | null;
  websiteDomain: string | null;
  websiteError: string | null;
  websiteCrawlStatus: string | null;
  websitePagesTotal: number;
  websitePagesScraped: number;
  isActive: boolean;
  lastScrapedAt: string | null;
  createdAt: string;
  _count: {
    scrapedContent: number;
  };
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<ContentSourceResponse | ContentSourceResponse[]>>
) {
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

  if (req.method === "GET") {
    const sources = await prisma.contentSource.findMany({
      where: { channelId },
      include: {
        _count: {
          select: { scrapedContent: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      data: sources.map((source) => ({
        id: source.id,
        sourceType: source.sourceType,
        telegramUsername: source.telegramUsername,
        telegramId: source.telegramId?.toString() ?? null,
        documentName: source.documentName,
        documentUrl: source.documentUrl,
        documentMimeType: source.documentMimeType,
        documentSize: source.documentSize,
        webpageUrl: source.webpageUrl,
        webpageTitle: source.webpageTitle,
        webpageDomain: source.webpageDomain,
        webpageError: source.webpageError,
        websiteUrl: source.websiteUrl,
        websiteTitle: source.websiteTitle,
        websiteDomain: source.websiteDomain,
        websiteError: source.websiteError,
        websiteCrawlStatus: source.websiteCrawlStatus,
        websitePagesTotal: source.websitePagesTotal,
        websitePagesScraped: source.websitePagesScraped,
        isActive: source.isActive,
        lastScrapedAt: source.lastScrapedAt?.toISOString() ?? null,
        createdAt: source.createdAt.toISOString(),
        _count: source._count,
      })),
    });
  }

  if (req.method === "POST") {
    const parseResult = CreateContentSourceSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.errors.map((e) => e.message).join(", "),
      });
    }

    // Normalize username (remove @ if present)
    const telegramUsername = parseResult.data.telegramUsername.replace(/^@/, "");

    // Check if source already exists for this channel
    const existingSource = await prisma.contentSource.findFirst({
      where: { channelId, telegramUsername },
    });

    if (existingSource) {
      return res.status(400).json({
        success: false,
        error: "This source is already added to your channel",
      });
    }

    const source = await prisma.contentSource.create({
      data: {
        channelId,
        telegramUsername,
      },
      include: {
        _count: {
          select: { scrapedContent: true },
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        id: source.id,
        sourceType: source.sourceType,
        telegramUsername: source.telegramUsername,
        telegramId: source.telegramId?.toString() ?? null,
        documentName: source.documentName,
        documentUrl: source.documentUrl,
        documentMimeType: source.documentMimeType,
        documentSize: source.documentSize,
        webpageUrl: source.webpageUrl,
        webpageTitle: source.webpageTitle,
        webpageDomain: source.webpageDomain,
        webpageError: source.webpageError,
        websiteUrl: source.websiteUrl,
        websiteTitle: source.websiteTitle,
        websiteDomain: source.websiteDomain,
        websiteError: source.websiteError,
        websiteCrawlStatus: source.websiteCrawlStatus,
        websitePagesTotal: source.websitePagesTotal,
        websitePagesScraped: source.websitePagesScraped,
        isActive: source.isActive,
        lastScrapedAt: source.lastScrapedAt?.toISOString() ?? null,
        createdAt: source.createdAt.toISOString(),
        _count: source._count,
      },
    });
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withAuth(handler);
