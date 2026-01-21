// React Query hook for SVG generation operations

import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "~/lib/api";

interface GenerateSVGParams {
  channelId: string;
  postContent: string;
  previousSvg?: string;
  feedback?: string;
}

interface SVGGenerationResponse {
  svg: string;
  svgUrl: string;
  pngUrl: string;
  prompt: string;
}

/**
 * Generate an SVG image from post content
 */
export function useSVGGeneration() {
  return useMutation({
    mutationFn: async (params: GenerateSVGParams) => {
      const response = await apiRequest<SVGGenerationResponse>(
        "/api/generate/svg",
        {
          method: "POST",
          body: params,
        }
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to generate SVG");
      }

      return response.data;
    },
  });
}

interface UseSVGGenerationHandlerOptions {
  channelId?: string;
  onSuccess?: (result: SVGGenerationResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * Convenience hook for SVG generation with simpler interface
 */
export function useSVGGenerationHandler({
  channelId,
  onSuccess,
  onError,
}: UseSVGGenerationHandlerOptions) {
  const mutation = useSVGGeneration();

  const generateSVG = async (
    postContent: string,
    options?: { previousSvg?: string; feedback?: string }
  ) => {
    if (!channelId) {
      throw new Error("Channel ID is required");
    }

    return mutation.mutateAsync(
      {
        channelId,
        postContent,
        previousSvg: options?.previousSvg,
        feedback: options?.feedback,
      },
      {
        onSuccess,
        onError,
      }
    );
  };

  return {
    generateSVG,
    isGenerating: mutation.isPending,
    result: mutation.data ?? null,
    error: mutation.error as Error | null,
    reset: mutation.reset,
  };
}
