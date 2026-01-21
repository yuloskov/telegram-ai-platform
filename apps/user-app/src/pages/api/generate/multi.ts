import type { NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";
import { generateMultiplePosts } from "@repo/ai";

interface SourceMedia {
  url: string;
  type: string;
}

interface SourceContent {
  id: string;
  text: string | null;
  telegramLink: string;
  media: SourceMedia[];
}

interface GeneratedPost {
  content: string;
  angle: string;
  sourceIds: string[];
}

interface MultiGenerateResponse {
  posts: GeneratedPost[];
  sources: SourceContent[];
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<MultiGenerateResponse>>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { user } = req;
  const { channelId, scrapedContentIds, channelContextPostIds, customPrompt, count = 3 } = req.body;

  if (!channelId) {
    return res.status(400).json({ success: false, error: "Channel ID is required" });
  }

  if (!scrapedContentIds || !Array.isArray(scrapedContentIds) || scrapedContentIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: "At least one scraped content ID is required",
    });
  }

  const postCount = Math.min(5, Math.max(1, Number(count) || 3));

  // Verify channel ownership
  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: user.id },
  });

  if (!channel) {
    return res.status(404).json({ success: false, error: "Channel not found" });
  }

  // Fetch scraped content with source and media
  const scrapedContent = await prisma.scrapedContent.findMany({
    where: {
      id: { in: scrapedContentIds },
      source: { channelId },
    },
    select: {
      id: true,
      text: true,
      views: true,
      telegramMessageId: true,
      source: {
        select: {
          telegramUsername: true,
        },
      },
      mediaFiles: {
        select: {
          url: true,
          type: true,
        },
      },
    },
  });

  if (scrapedContent.length === 0) {
    return res.status(404).json({ success: false, error: "No scraped content found" });
  }

  // Fetch channel context posts - either selected ones or recent published
  const recentPosts = await prisma.post.findMany({
    where: channelContextPostIds?.length > 0
      ? { id: { in: channelContextPostIds }, channelId, status: "published" }
      : { channelId, status: "published" },
    orderBy: { publishedAt: "desc" },
    take: channelContextPostIds?.length > 0 ? undefined : 10,
    select: { content: true },
  });

  try {
    const result = await generateMultiplePosts(
      {
        niche: channel.niche ?? undefined,
        tone: channel.tone,
        language: channel.language,
        hashtags: channel.hashtags,
      },
      scrapedContent.map((c) => ({ id: c.id, text: c.text, views: c.views })),
      recentPosts.map((p) => p.content),
      customPrompt,
      postCount
    );

    // Mark scraped content as used for generation
    await prisma.scrapedContent.updateMany({
      where: { id: { in: scrapedContent.map((c) => c.id) } },
      data: { usedForGeneration: true },
    });

    return res.status(200).json({
      success: true,
      data: {
        posts: result.posts,
        sources: scrapedContent.map((c) => ({
          id: c.id,
          text: c.text,
          telegramLink: `https://t.me/${c.source.telegramUsername}/${c.telegramMessageId}`,
          media: c.mediaFiles.map((m) => ({ url: m.url, type: m.type })),
        })),
      },
    });
  } catch (error) {
    console.error("Multi-generation error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate content",
    });
  }
}

export default withAuth(handler);
