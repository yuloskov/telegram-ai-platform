import type { NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";

interface ScrapedPostResponse {
  id: string;
  text: string | null;
  views: number;
  scrapedAt: string;
  mediaUrls: string[];
}

interface SourceWithContentResponse {
  id: string;
  sourceType: "telegram" | "document" | "webpage" | "website";
  telegramUsername: string | null;
  documentName: string | null;
  webpageTitle: string | null;
  webpageDomain: string | null;
  websiteTitle: string | null;
  websiteDomain: string | null;
  isActive: boolean;
  scrapedContent: ScrapedPostResponse[];
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<SourceWithContentResponse[]>>
) {
  const { user } = req;
  const { id: channelId } = req.query;

  if (typeof channelId !== "string") {
    return res.status(400).json({ success: false, error: "Invalid channel ID" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Verify channel ownership
  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: user.id },
  });

  if (!channel) {
    return res.status(404).json({ success: false, error: "Channel not found" });
  }

  // Fetch all sources with their scraped content, ordered by telegramMessageId (most recent first)
  const sources = await prisma.contentSource.findMany({
    where: { channelId },
    include: {
      scrapedContent: {
        orderBy: { telegramMessageId: "desc" },
        select: {
          id: true,
          text: true,
          views: true,
          scrapedAt: true,
          mediaUrls: true,
        },
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
      documentName: source.documentName,
      webpageTitle: source.webpageTitle,
      webpageDomain: source.webpageDomain,
      websiteTitle: source.websiteTitle,
      websiteDomain: source.websiteDomain,
      isActive: source.isActive,
      scrapedContent: source.scrapedContent.map((content) => ({
        id: content.id,
        text: content.text,
        views: content.views,
        scrapedAt: content.scrapedAt.toISOString(),
        mediaUrls: content.mediaUrls,
      })),
    })),
  });
}

export default withAuth(handler);
