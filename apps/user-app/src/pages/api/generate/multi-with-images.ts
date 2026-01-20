import type { NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";
import { generateMultiplePostsWithImages, type ImageDecision } from "@repo/ai";
import { processPostImages, type ProcessedImage } from "~/lib/image-processing";

interface SourceMedia {
  url: string;
  type: string;
}

interface ImageAnalysisResult {
  hasWatermark: boolean;
  hasLink: boolean;
  hasLogo: boolean;
  reasoning: string;
  suggestedPrompt?: string;
}

// Convert storage path to API media URL
function toMediaUrl(storagePath: string): string {
  // storagePath is like "telegram-platform/scraped/channel/123.jpg"
  // We need "/api/media/telegram-platform/scraped/channel/123.jpg"
  return `/api/media/${storagePath}`;
}

interface SourceContent {
  id: string;
  text: string | null;
  telegramLink: string;
  media: SourceMedia[];
}

interface PostImage {
  url: string;
  isGenerated: boolean;
  sourceId?: string;
  prompt?: string;
  analysisResult?: ImageAnalysisResult;
  originalUrl?: string;
}

interface GeneratedPost {
  content: string;
  angle: string;
  sourceIds: string[];
  imageDecision: ImageDecision;
  images: PostImage[];
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
  const { channelId, scrapedContentIds, customPrompt, count = 3 } = req.body;

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
        // Filter out video/document placeholders - only count real image URLs
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

    // Build source lookup map
    const sourceMap = new Map(scrapedContent.map((c) => [c.id, c]));

    // Process posts and attach images with analysis
    const postsWithImages: GeneratedPost[] = [];

    for (const post of result.posts) {
      // Collect images from source posts
      const sourceIdsToUse =
        post.imageDecision.strategy === "use_original" &&
        post.imageDecision.originalImageSourceIds
          ? post.imageDecision.originalImageSourceIds
          : post.sourceIds;

      const imagesToProcess: Array<{
        url: string;
        storagePath: string;
        sourceId: string;
      }> = [];

      for (const sourceId of sourceIdsToUse) {
        const source = sourceMap.get(sourceId);
        if (source) {
          const validPaths = source.mediaUrls.filter(
            (path) => !path.startsWith("skipped:")
          );
          for (const path of validPaths) {
            imagesToProcess.push({
              url: toMediaUrl(path),
              storagePath: path,
              sourceId,
            });
          }
        }
      }

      // Analyze images and generate replacements for those with issues
      const { originalImages, generatedImages } = await processPostImages(
        imagesToProcess,
        channelId
      );

      // Combine original and generated images
      const allImages: PostImage[] = [
        ...originalImages,
        ...generatedImages,
      ];

      postsWithImages.push({
        content: post.content,
        angle: post.angle,
        sourceIds: post.sourceIds,
        imageDecision: post.imageDecision,
        images: allImages,
      });
    }

    // Mark scraped content as used
    await prisma.scrapedContent.updateMany({
      where: { id: { in: scrapedContent.map((c) => c.id) } },
      data: { usedForGeneration: true },
    });

    return res.status(200).json({
      success: true,
      data: {
        posts: postsWithImages,
        sources: scrapedContent.map((c) => ({
          id: c.id,
          text: c.text,
          telegramLink: `https://t.me/${c.source.telegramUsername}/${c.telegramMessageId}`,
          media: c.mediaUrls
            .filter((path) => !path.startsWith("skipped:"))
            .map((path) => ({ url: toMediaUrl(path), type: "image" })),
        })),
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
