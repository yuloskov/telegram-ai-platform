import type { NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";

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
  source: {
    sourceType: "telegram" | "document" | "webpage";
    telegramUsername: string | null;
    documentName: string | null;
    webpageTitle: string | null;
    webpageDomain: string | null;
  };
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<ScrapedContentResponse>>
) {
  const { user } = req;
  const { id: channelId, sourceId, contentId } = req.query;

  if (typeof channelId !== "string" || typeof sourceId !== "string" || typeof contentId !== "string") {
    return res.status(400).json({ success: false, error: "Invalid IDs" });
  }

  // Verify channel ownership
  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: user.id },
  });

  if (!channel) {
    return res.status(404).json({ success: false, error: "Channel not found" });
  }

  if (req.method === "GET") {
    const content = await prisma.scrapedContent.findFirst({
      where: {
        id: contentId,
        sourceId,
        source: { channelId },
      },
      include: {
        source: {
          select: {
            sourceType: true,
            telegramUsername: true,
            documentName: true,
            webpageTitle: true,
            webpageDomain: true,
          },
        },
      },
    });

    if (!content) {
      return res.status(404).json({ success: false, error: "Content not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: content.id,
        telegramMessageId: content.telegramMessageId?.toString() ?? null,
        chunkIndex: content.chunkIndex,
        sectionTitle: content.sectionTitle,
        text: content.text,
        mediaUrls: content.mediaUrls,
        views: content.views,
        forwards: content.forwards,
        reactions: content.reactions,
        scrapedAt: content.scrapedAt.toISOString(),
        usedForGeneration: content.usedForGeneration,
        source: {
          sourceType: content.source.sourceType,
          telegramUsername: content.source.telegramUsername,
          documentName: content.source.documentName,
          webpageTitle: content.source.webpageTitle,
          webpageDomain: content.source.webpageDomain,
        },
      },
    });
  }

  if (req.method === "DELETE") {
    // Verify content exists and belongs to this source/channel
    const content = await prisma.scrapedContent.findFirst({
      where: {
        id: contentId,
        sourceId,
        source: { channelId },
      },
    });

    if (!content) {
      return res.status(404).json({ success: false, error: "Content not found" });
    }

    await prisma.scrapedContent.delete({
      where: { id: contentId },
    });

    return res.status(200).json({
      success: true,
      data: {
        id: content.id,
        telegramMessageId: content.telegramMessageId?.toString() ?? null,
        chunkIndex: content.chunkIndex,
        sectionTitle: content.sectionTitle,
        text: content.text,
        mediaUrls: content.mediaUrls,
        views: content.views,
        forwards: content.forwards,
        reactions: content.reactions,
        scrapedAt: content.scrapedAt.toISOString(),
        usedForGeneration: content.usedForGeneration,
        source: {
          sourceType: "telegram" as const,
          telegramUsername: null,
          documentName: null,
          webpageTitle: null,
          webpageDomain: null,
        },
      },
    });
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withAuth(handler);
