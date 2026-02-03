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
  originalImageUrl?: string;
  sourceStoragePath?: string;
  postContent?: string;
}

interface GenerateNewImageParams {
  channelId: string;
  prompt: string;
  useSvg: boolean;
}

interface SVGResponse {
  svg: string;
  svgUrl: string;
  pngUrl: string;
  prompt: string;
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
          sourceStoragePath: params.sourceStoragePath,
          postContent: params.postContent,
          mode: "svg",
        },
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to regenerate image as SVG");
      }

      // Preserve sourceStoragePath for subsequent regenerations
      const sourceStoragePath = params.sourceStoragePath
        ?? originalImage.sourceStoragePath
        ?? (originalImage.isGenerated ? undefined : originalImage.url?.replace(/^\/api\/media\//, ""));

      const newImage: PostImage = {
        url: response.data.url,
        isGenerated: true,
        prompt: response.data.prompt,
        originalUrl: originalImage.isGenerated
          ? originalImage.originalUrl
          : originalImage.url,
        svgUrl: response.data.svgUrl,
        isSvg: response.data.isSvg,
        sourceStoragePath,
      };

      return { oldUrl: originalImage.url, newImage };
    },
    onSuccess: (result) => {
      onSuccess?.(result.oldUrl, result.newImage);
    },
  });
}

/**
 * Generate a new image from a custom prompt.
 * Supports both regular images and SVG.
 */
export function useGenerateNewImage(
  onSuccess?: (newImage: PostImage) => void
) {
  return useMutation({
    mutationFn: async (params: GenerateNewImageParams) => {
      if (params.useSvg) {
        // Generate SVG - use only the user's prompt (not post content)
        // The prompt is used as the content to visualize
        // additionalStylePrompt is concatenated with channel's style settings
        const response = await apiRequest<SVGResponse>("/api/generate/svg", {
          method: "POST",
          body: {
            channelId: params.channelId,
            postContent: params.prompt,
            additionalStylePrompt: params.prompt,
          },
        });

        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to generate SVG");
        }

        const newImage: PostImage = {
          url: response.data.pngUrl,
          isGenerated: true,
          prompt: response.data.prompt,
          svgUrl: response.data.svgUrl,
          isSvg: true,
        };

        return newImage;
      } else {
        // Generate regular image
        const response = await apiRequest<ImageResponse>("/api/generate/image", {
          method: "POST",
          body: {
            channelId: params.channelId,
            prompt: params.prompt,
          },
        });

        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to generate image");
        }

        const newImage: PostImage = {
          url: response.data.url,
          isGenerated: true,
          prompt: response.data.prompt,
        };

        return newImage;
      }
    },
    onSuccess: (result) => {
      onSuccess?.(result);
    },
  });
}

interface UseImageGenerationOptions {
  channelId?: string;
  postContent?: string;
  onImageRegenerated?: (oldUrl: string, newImage: PostImage) => void;
}

/**
 * Combined hook for image regeneration and cleaning.
 * Provides a simpler interface for components.
 */
export function useImageGeneration({
  channelId,
  postContent,
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

    // Use sourceStoragePath if available (for generated images), otherwise fall back to URL
    const sourceStoragePath = image.sourceStoragePath
      ?? (image.isGenerated ? undefined : image.url?.replace(/^\/api\/media\//, ""));

    svgMutation.mutate({
      params: {
        channelId,
        sourceStoragePath,
        // Use post content directly if available (best for SVG regeneration)
        postContent,
        // Fall back to URL if no storage path (for backwards compatibility)
        originalImageUrl: !sourceStoragePath && !postContent
          ? (image.isGenerated ? (image.originalUrl ?? image.url) : image.url)
          : undefined,
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
