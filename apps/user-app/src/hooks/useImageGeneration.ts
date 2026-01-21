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
  svgUrl?: string;
  isSvg?: boolean;
}

interface SVGRegenerateParams {
  channelId: string;
  originalImageUrl: string;
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

/**
 * Regenerate an image as SVG using AI.
 * Extracts content from the original image and generates an SVG representation.
 */
export function useRegenerateWithSVG(
  onSuccess?: (oldUrl: string, newImage: PostImage) => void
) {
  return useMutation({
    mutationFn: async ({
      params,
      originalImage,
    }: {
      params: SVGRegenerateParams;
      originalImage: PostImage;
    }) => {
      const response = await apiRequest<ImageResponse>("/api/generate/image", {
        method: "POST",
        body: {
          channelId: params.channelId,
          originalImageUrl: params.originalImageUrl,
          mode: "svg",
        },
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to regenerate image as SVG");
      }

      const newImage: PostImage = {
        url: response.data.url,
        isGenerated: true,
        prompt: response.data.prompt,
        originalUrl: originalImage.isGenerated
          ? originalImage.originalUrl
          : originalImage.url,
        svgUrl: response.data.svgUrl,
        isSvg: response.data.isSvg,
      };

      return { oldUrl: originalImage.url, newImage };
    },
    onSuccess: (result) => {
      onSuccess?.(result.oldUrl, result.newImage);
    },
  });
}

interface UseImageGenerationOptions {
  channelId?: string;
  onImageRegenerated?: (oldUrl: string, newImage: PostImage) => void;
}

/**
 * Combined hook for image regeneration and cleaning.
 * Provides a simpler interface for components.
 */
export function useImageGeneration({
  channelId,
  onImageRegenerated,
}: UseImageGenerationOptions) {
  const regenerateMutation = useRegenerateImage(onImageRegenerated);
  const cleanMutation = useCleanImage(onImageRegenerated);
  const svgMutation = useRegenerateWithSVG(onImageRegenerated);

  const regenerateImage = (image: PostImage) => {
    if (!channelId) return;
    regenerateMutation.mutate({
      params: {
        channelId,
        prompt: image.prompt,
        suggestedPrompt: image.analysisResult?.suggestedPrompt,
        originalImageUrl: image.isGenerated ? image.originalUrl : image.url,
      },
      originalImage: image,
    });
  };

  const cleanImage = (image: PostImage) => {
    if (!channelId) return;
    cleanMutation.mutate({
      params: { channelId, originalImageUrl: image.url },
      originalImage: image,
    });
  };

  const regenerateAsSvg = (image: PostImage) => {
    if (!channelId) return;
    svgMutation.mutate({
      params: {
        channelId,
        originalImageUrl: image.isGenerated ? (image.originalUrl ?? image.url) : image.url,
      },
      originalImage: image,
    });
  };

  return {
    regeneratingUrl: regenerateMutation.isPending
      ? regenerateMutation.variables?.originalImage.url ?? null
      : null,
    cleaningUrl: cleanMutation.isPending
      ? cleanMutation.variables?.originalImage.url ?? null
      : null,
    regeneratingSvgUrl: svgMutation.isPending
      ? svgMutation.variables?.originalImage.url ?? null
      : null,
    regenerateImage,
    cleanImage,
    regenerateAsSvg,
  };
}
