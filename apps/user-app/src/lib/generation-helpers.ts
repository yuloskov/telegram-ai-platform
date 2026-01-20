// Helpers for post generation API routes

import type { ImageDecision } from "@repo/ai";
import { processPostImages } from "~/lib/image-processing";

// Convert storage path to API media URL
export function toMediaUrl(storagePath: string): string {
  return `/api/media/${storagePath}`;
}

interface ImageAnalysisResult {
  hasWatermark: boolean;
  hasLink: boolean;
  hasLogo: boolean;
  reasoning: string;
  suggestedPrompt?: string;
}

interface SourceMedia {
  url: string;
  type: string;
}

export interface PostImage {
  url: string;
  isGenerated: boolean;
  sourceId?: string;
  prompt?: string;
  analysisResult?: ImageAnalysisResult;
  originalUrl?: string;
}

export interface SourceContent {
  id: string;
  text: string | null;
  telegramLink: string;
  media: SourceMedia[];
}

export interface GeneratedPost {
  content: string;
  angle: string;
  sourceIds: string[];
  imageDecision: ImageDecision;
  images: PostImage[];
}

interface ScrapedContentWithSource {
  id: string;
  text: string | null;
  mediaUrls: string[];
  source: { telegramUsername: string };
  telegramMessageId: bigint;
}

interface AIGeneratedPost {
  content: string;
  angle: string;
  sourceIds: string[];
  imageDecision: ImageDecision;
}

/**
 * Process a single generated post to attach images with analysis.
 */
export async function processGeneratedPost(
  post: AIGeneratedPost,
  sourceMap: Map<string, ScrapedContentWithSource>,
  channelId: string,
  language: string,
  autoRegenerate: boolean
): Promise<GeneratedPost> {
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

  const { originalImages, generatedImages } = await processPostImages(
    imagesToProcess,
    channelId,
    language,
    autoRegenerate
  );

  const allImages: PostImage[] = [...originalImages, ...generatedImages];

  return {
    content: post.content,
    angle: post.angle,
    sourceIds: post.sourceIds,
    imageDecision: post.imageDecision,
    images: allImages,
  };
}

/**
 * Transform scraped content to source content format for API response.
 */
export function transformToSourceContent(
  content: ScrapedContentWithSource
): SourceContent {
  return {
    id: content.id,
    text: content.text,
    telegramLink: `https://t.me/${content.source.telegramUsername}/${content.telegramMessageId}`,
    media: content.mediaUrls
      .filter((path) => !path.startsWith("skipped:"))
      .map((path) => ({ url: toMediaUrl(path), type: "image" })),
  };
}
