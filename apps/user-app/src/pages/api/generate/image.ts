import type { NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";
import { generateImage, analyzeImage, hasIssues } from "@repo/ai";
import { uploadFile } from "@repo/shared/storage";

interface RegenerateImageResponse {
  url: string;
  prompt: string;
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
  const { channelId, prompt, originalImageUrl } = req.body;

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
    let imagePrompt = prompt;

    // Priority: 1) explicit prompt, 2) suggestedPrompt from analysis, 3) analyze image
    if (!imagePrompt && suggestedPrompt) {
      imagePrompt = suggestedPrompt;
    }

    // If still no prompt and we have an original URL, try to analyze it
    // Note: This won't work for localhost URLs when using external AI APIs
    if (!imagePrompt && originalImageUrl) {
      const baseUrl = process.env.NEXT_PUBLIC_USER_APP_URL ?? "http://localhost:3000";
      const isLocalhost = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");

      if (isLocalhost) {
        // Can't analyze localhost images with external API
        // Use a default prompt based on the context
        imagePrompt = "Create a clean, professional, visually appealing image suitable for a social media post. The image should be high quality, without any text, watermarks, or logos.";
      } else {
        const absoluteUrl = originalImageUrl.startsWith("http")
          ? originalImageUrl
          : `${baseUrl}${originalImageUrl}`;

        try {
          const analysis = await analyzeImage(absoluteUrl);
          if (analysis.suggestedPrompt) {
            imagePrompt = analysis.suggestedPrompt;
          }
        } catch (analysisError) {
          console.error("Image analysis failed, using default prompt:", analysisError);
        }
      }

      // Fallback if analysis didn't provide a prompt
      if (!imagePrompt) {
        imagePrompt = "Create a clean, professional, visually appealing image suitable for a social media post. The image should be high quality, without any text, watermarks, or logos.";
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
