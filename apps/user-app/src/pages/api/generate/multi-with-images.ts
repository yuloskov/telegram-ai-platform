import type { NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";
import { generateMultiplePostsWithImages } from "@repo/ai";
import {
  processGeneratedPost,
  transformToSourceContent,
  type GeneratedPost,
  type SourceContent,
} from "~/lib/generation-helpers";

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
  const {
    channelId,
    scrapedContentIds,
    customPrompt,
    count = 3,
    autoRegenerate = false,
  } = req.body;

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

  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: user.id },
  });

  if (!channel) {
    return res.status(404).json({ success: false, error: "Channel not found" });
  }

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
      source: { select: { telegramUsername: true } },
      mediaUrls: true,
    },
  });

  if (scrapedContent.length === 0) {
    return res.status(404).json({ success: false, error: "No scraped content found" });
  }

  const recentPosts = await prisma.post.findMany({
    where: { channelId, status: "published" },
    orderBy: { publishedAt: "desc" },
    take: 10,
    select: { content: true },
  });

  try {
    const result = await generateMultiplePostsWithImages(
      {
        niche: channel.niche ?? undefined,
        tone: channel.tone,
        language: channel.language,
        hashtags: channel.hashtags,
      },
      scrapedContent.map((c) => {
        const imageUrls = c.mediaUrls.filter((url) => !url.startsWith("skipped:"));
        return {
          id: c.id,
          text: c.text,
          views: c.views,
          hasImages: imageUrls.length > 0,
          imageCount: imageUrls.length,
        };
      }),
      recentPosts.map((p) => p.content),
      customPrompt,
      postCount
    );

    const sourceMap = new Map(scrapedContent.map((c) => [c.id, c]));

    const postsWithImages: GeneratedPost[] = [];
    for (const post of result.posts) {
      const processedPost = await processGeneratedPost(
        post,
        sourceMap,
        channelId,
        channel.language,
        autoRegenerate
      );
      postsWithImages.push(processedPost);
    }

    await prisma.scrapedContent.updateMany({
      where: { id: { in: scrapedContent.map((c) => c.id) } },
      data: { usedForGeneration: true },
    });

    return res.status(200).json({
      success: true,
      data: {
        posts: postsWithImages,
        sources: scrapedContent.map(transformToSourceContent),
      },
    });
  } catch (error) {
    console.error("Multi-generation with images error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate content",
    });
  }
}

export default withAuth(handler);
