import type { NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";

interface ScrapedPostResponse {
  id: string;
  text: string | null;
  views: number;
  forwards: number;
  reactions: number;
  usedForGeneration: boolean;
}

interface SourceWithContentResponse {
  id: string;
  telegramUsername: string;
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

  // Fetch all sources with their scraped content, ordered by views
  const sources = await prisma.contentSource.findMany({
    where: { channelId },
    include: {
      scrapedContent: {
        orderBy: { views: "desc" },
        select: {
          id: true,
          text: true,
          views: true,
          forwards: true,
          reactions: true,
          usedForGeneration: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.status(200).json({
    success: true,
    data: sources.map((source) => ({
      id: source.id,
      telegramUsername: source.telegramUsername,
      isActive: source.isActive,
      scrapedContent: source.scrapedContent.map((content) => ({
        id: content.id,
        text: content.text,
        views: content.views,
        forwards: content.forwards,
        reactions: content.reactions,
        usedForGeneration: content.usedForGeneration,
      })),
    })),
  });
}

export default withAuth(handler);
