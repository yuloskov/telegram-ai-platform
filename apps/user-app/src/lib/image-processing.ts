import {
  analyzeImage,
  hasIssues,
  generateImage,
  type ImageAnalysisResult,
} from "@repo/ai";
import { uploadFile, storagePathToBase64 } from "@repo/shared/storage";

export interface ProcessedImage {
  url: string;
  isGenerated: boolean;
  sourceId?: string;
  prompt?: string;
  analysisResult?: ImageAnalysisResult;
  originalUrl?: string;
}

interface ImageToProcess {
  url: string;
  storagePath: string;
  sourceId: string;
}

/**
 * Convert base64 image data to a Buffer
 */
function base64ToBuffer(base64Data: string): Buffer {
  // Remove data URL prefix if present
  const base64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(base64, "base64");
}

/**
 * Analyze and process images for a post
 * Returns both original images (with analysis) and generated replacements
 */
export async function processPostImages(
  images: ImageToProcess[],
  channelId: string
): Promise<{
  originalImages: ProcessedImage[];
  generatedImages: ProcessedImage[];
}> {
  const originalImages: ProcessedImage[] = [];
  const generatedImages: ProcessedImage[] = [];

  if (images.length === 0) {
    return { originalImages, generatedImages };
  }

  // Analyze all images
  for (const image of images) {
    try {
      // Convert storage path to base64 data URL for AI analysis
      // This avoids the localhost URL issue with external AI APIs
      const base64DataUrl = await storagePathToBase64(image.storagePath);
      const analysisResult = await analyzeImage(base64DataUrl);

      // Add original image with analysis result
      originalImages.push({
        url: image.url,
        isGenerated: false,
        sourceId: image.sourceId,
        analysisResult,
      });

      // If issues detected, generate a replacement
      if (hasIssues(analysisResult) && analysisResult.suggestedPrompt) {
        const generatedImageData = await generateImage(analysisResult.suggestedPrompt);

        if (generatedImageData) {
          // Upload to MinIO
          const storagePath = await uploadGeneratedImage(
            generatedImageData,
            channelId
          );

          if (storagePath) {
            generatedImages.push({
              url: `/api/media/${storagePath}`,
              isGenerated: true,
              prompt: analysisResult.suggestedPrompt,
              originalUrl: image.url,
            });
          }
        }
      }
    } catch (error) {
      console.error(`Failed to process image ${image.url}:`, error);
      // Still include the original image without analysis
      originalImages.push({
        url: image.url,
        isGenerated: false,
        sourceId: image.sourceId,
      });
    }
  }

  return { originalImages, generatedImages };
}

/**
 * Upload a generated image (base64) to MinIO
 */
async function uploadGeneratedImage(
  imageData: string,
  channelId: string
): Promise<string | null> {
  try {
    const buffer = base64ToBuffer(imageData);
    const timestamp = Date.now();
    const objectName = `generated/${channelId}/${timestamp}.jpg`;

    const storagePath = await uploadFile(
      "telegram-platform",
      objectName,
      buffer,
      "image/jpeg"
    );

    return storagePath;
  } catch (error) {
    console.error("Failed to upload generated image:", error);
    return null;
  }
}
