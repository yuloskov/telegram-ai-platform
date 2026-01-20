// React Query hooks for image generation operations
// Migrates post-image-selector.tsx from direct fetch to useMutation

import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "~/lib/api";
import type { PostImage } from "~/types";

interface GenerateImageParams {
  channelId: string;
  prompt?: string;
  suggestedPrompt?: string;
  originalImageUrl?: string;
}

interface CleanImageParams {
  channelId: string;
  originalImageUrl: string;
}

interface ImageResponse {
  url: string;
  prompt?: string;
}

/**
 * Regenerate an image using AI.
 */
export function useRegenerateImage(
  onSuccess?: (oldUrl: string, newImage: PostImage) => void
) {
  return useMutation({
    mutationFn: async ({
      params,
      originalImage,
    }: {
      params: GenerateImageParams;
      originalImage: PostImage;
    }) => {
      const response = await apiRequest<ImageResponse>("/api/generate/image", {
        method: "POST",
        body: {
          channelId: params.channelId,
          prompt: params.prompt,
          suggestedPrompt: params.suggestedPrompt,
          originalImageUrl: params.originalImageUrl,
        },
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to regenerate image");
      }

      const newImage: PostImage = {
        url: response.data.url,
        isGenerated: true,
        prompt: response.data.prompt,
        originalUrl: originalImage.isGenerated
          ? originalImage.originalUrl
          : originalImage.url,
      };

      return { oldUrl: originalImage.url, newImage };
    },
    onSuccess: (result) => {
      onSuccess?.(result.oldUrl, result.newImage);
    },
  });
}

/**
 * Clean an image (remove watermarks, logos, links) using AI.
 */
export function useCleanImage(
  onSuccess?: (oldUrl: string, newImage: PostImage) => void
) {
  return useMutation({
    mutationFn: async ({
      params,
      originalImage,
    }: {
      params: CleanImageParams;
      originalImage: PostImage;
    }) => {
      const response = await apiRequest<ImageResponse>("/api/generate/image", {
        method: "POST",
        body: {
          channelId: params.channelId,
          originalImageUrl: params.originalImageUrl,
          mode: "clean",
        },
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to clean image");
      }

      const newImage: PostImage = {
        url: response.data.url,
        isGenerated: true,
        prompt: response.data.prompt,
        originalUrl: originalImage.url,
      };

      return { oldUrl: originalImage.url, newImage };
    },
    onSuccess: (result) => {
      onSuccess?.(result.oldUrl, result.newImage);
    },
  });
}
