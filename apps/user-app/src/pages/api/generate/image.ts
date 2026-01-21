import type { NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";
import { generateImage, analyzeImage, cleanImage, extractImageContent, generateSVG, type SVGStyleConfig } from "@repo/ai";
import { uploadFile, storagePathToBase64 } from "@repo/shared/storage";
import { svgToPng, normalizeSvgDimensions } from "@repo/shared/svg";

interface RegenerateImageResponse {
  url: string;
  prompt: string;
  svgUrl?: string;
  isSvg?: boolean;
}

/**
 * Convert base64 image data to a Buffer
 */
function base64ToBuffer(base64Data: string): Buffer {
  const base64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(base64, "base64");
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<RegenerateImageResponse>>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { user } = req;
  const { channelId, prompt, originalImageUrl, sourceStoragePath, mode } = req.body;

  if (!channelId) {
    return res.status(400).json({ success: false, error: "Channel ID is required" });
  }

  // Verify user owns the channel
  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: user.id },
  });

  if (!channel) {
    return res.status(404).json({ success: false, error: "Channel not found" });
  }

  const { suggestedPrompt } = req.body; // From original image's analysis result

  try {
    // Mode: "clean" - edit the source image to remove watermarks
    if (mode === "clean") {
      if (!originalImageUrl) {
        return res.status(400).json({
          success: false,
          error: "originalImageUrl is required for clean mode",
        });
      }

      // Convert media URL to storage path and then to base64
      const storagePath = originalImageUrl.replace(/^\/api\/media\//, "");
      const base64DataUrl = await storagePathToBase64(storagePath);

      console.log("Cleaning image:", originalImageUrl);
      const imageData = await cleanImage(base64DataUrl);

      if (!imageData) {
        return res.status(500).json({
          success: false,
          error: "Image cleaning failed - the AI model did not return an image. Please try again.",
        });
      }

      // Upload to MinIO
      const buffer = base64ToBuffer(imageData);
      const timestamp = Date.now();
      const objectName = `cleaned/${channelId}/${timestamp}.jpg`;

      const uploadedPath = await uploadFile(
        "telegram-platform",
        objectName,
        buffer,
        "image/jpeg"
      );

      return res.status(200).json({
        success: true,
        data: {
          url: `/api/media/${uploadedPath}`,
          prompt: "Cleaned image (watermarks removed)",
        },
      });
    }

    // Mode: "svg" - generate SVG from image content
    if (mode === "svg") {
      if (!sourceStoragePath && !originalImageUrl) {
        return res.status(400).json({
          success: false,
          error: "Either sourceStoragePath or originalImageUrl is required for SVG mode",
        });
      }

      // Use sourceStoragePath directly if provided, otherwise convert from URL
      const storagePath = sourceStoragePath ?? originalImageUrl.replace(/^\/api\/media\//, "");
      const base64DataUrl = await storagePathToBase64(storagePath);

      // Extract content from the original image
      console.log("Extracting content from image for SVG generation:", storagePath);
      const imageContent = await extractImageContent(base64DataUrl, channel.language);

      // Build content for SVG generation
      let svgContent = imageContent.description;
      if (imageContent.textContent) {
        svgContent = imageContent.textContent;
      }

      // Build style config from channel settings or defaults
      const styleConfig: SVGStyleConfig = {
        stylePrompt: channel.svgStylePrompt ?? undefined,
        themeColor: channel.svgThemeColor ?? (imageContent.colors[0] || "#3B82F6"),
        textColor: channel.svgTextColor ?? "#1F2937",
        backgroundStyle: (channel.svgBackgroundStyle as SVGStyleConfig["backgroundStyle"]) ?? "gradient",
        fontStyle: (channel.svgFontStyle as SVGStyleConfig["fontStyle"]) ?? "modern",
      };

      // Generate SVG
      console.log("Generating SVG with content:", svgContent);
      const svgResult = await generateSVG(svgContent, styleConfig, channel.language);

      if (!svgResult) {
        return res.status(500).json({
          success: false,
          error: "SVG generation failed. Please try again.",
        });
      }

      // Normalize and convert to PNG
      const normalizedSvg = normalizeSvgDimensions(svgResult.svg, 1080, 1080);
      const pngBuffer = await svgToPng(normalizedSvg, { width: 1080, height: 1080 });

      // Upload both SVG and PNG
      const timestamp = Date.now();
      const svgObjectName = `svg/${channelId}/${timestamp}.svg`;
      const pngObjectName = `svg-png/${channelId}/${timestamp}.png`;

      const [svgPath, pngPath] = await Promise.all([
        uploadFile("telegram-platform", svgObjectName, Buffer.from(normalizedSvg), "image/svg+xml"),
        uploadFile("telegram-platform", pngObjectName, pngBuffer, "image/png"),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          url: `/api/media/${pngPath}`,
          svgUrl: `/api/media/${svgPath}`,
          prompt: svgResult.prompt,
          isSvg: true,
        },
      });
    }

    // Mode: "generate" (default) - generate new image from prompt
    let imagePrompt = prompt;

    // Priority: 1) explicit prompt, 2) suggestedPrompt from analysis, 3) analyze image
    if (!imagePrompt && suggestedPrompt) {
      imagePrompt = suggestedPrompt;
    }

    // If still no prompt and we have an original URL, try to analyze it
    if (!imagePrompt && originalImageUrl) {
      try {
        // Convert media URL to storage path and then to base64
        // originalImageUrl is like "/api/media/telegram-platform/scraped/channel/123.jpg"
        const storagePath = originalImageUrl.replace(/^\/api\/media\//, "");
        const base64DataUrl = await storagePathToBase64(storagePath);

        const analysis = await analyzeImage(base64DataUrl, channel.language);
        if (analysis.suggestedPrompt) {
          imagePrompt = analysis.suggestedPrompt;
        }
      } catch (analysisError) {
        console.error("Image analysis failed, using default prompt:", analysisError);
      }

      // Fallback if analysis didn't provide a prompt
      if (!imagePrompt) {
        imagePrompt =
          channel.language === "ru"
            ? "Создай чистое, профессиональное, визуально привлекательное изображение, подходящее для поста в социальной сети. Изображение должно быть высокого качества, без текста, водяных знаков или логотипов."
            : "Create a clean, professional, visually appealing image suitable for a social media post. The image should be high quality, without any text, watermarks, or logos.";
      }
    }

    if (!imagePrompt) {
      return res.status(400).json({
        success: false,
        error: "Either prompt, suggestedPrompt, or originalImageUrl is required",
      });
    }

    // Generate the image
    console.log("Generating image with prompt:", imagePrompt);
    const imageData = await generateImage(imagePrompt);

    if (!imageData) {
      console.error("Image generation returned null for prompt:", imagePrompt);
      return res.status(500).json({
        success: false,
        error: "Image generation failed - the AI model did not return an image. This may be a temporary issue, please try again.",
      });
    }

    console.log("Image generated successfully, data length:", imageData.length);

    // Upload to MinIO
    const buffer = base64ToBuffer(imageData);
    const timestamp = Date.now();
    const objectName = `generated/${channelId}/${timestamp}.jpg`;

    const storagePath = await uploadFile(
      "telegram-platform",
      objectName,
      buffer,
      "image/jpeg"
    );

    const url = `/api/media/${storagePath}`;

    return res.status(200).json({
      success: true,
      data: {
        url,
        prompt: imagePrompt,
      },
    });
  } catch (error) {
    console.error("Image regeneration error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to regenerate image",
    });
  }
}

export default withAuth(handler);
