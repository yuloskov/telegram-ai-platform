import type { NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";
import { generateSVG, regenerateSVG, type SVGStyleConfig } from "@repo/ai";
import { uploadFile } from "@repo/shared/storage";
import { svgToPng, normalizeSvgDimensions } from "@repo/shared/svg";

interface SVGGenerationResponse {
  svg: string;
  svgUrl: string;
  pngUrl: string;
  prompt: string;
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<SVGGenerationResponse>>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { user } = req;
  const { channelId, postContent, previousSvg, feedback } = req.body;

  if (!channelId) {
    return res.status(400).json({ success: false, error: "Channel ID is required" });
  }

  if (!postContent) {
    return res.status(400).json({ success: false, error: "Post content is required" });
  }

  // Verify user owns the channel
  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: user.id },
  });

  if (!channel) {
    return res.status(404).json({ success: false, error: "Channel not found" });
  }

  // Build SVG style config from channel settings
  const styleConfig: SVGStyleConfig = {
    stylePrompt: channel.svgStylePrompt ?? undefined,
    themeColor: channel.svgThemeColor,
    textColor: channel.svgTextColor,
    backgroundStyle: channel.svgBackgroundStyle as SVGStyleConfig["backgroundStyle"],
    fontStyle: channel.svgFontStyle as SVGStyleConfig["fontStyle"],
  };

  try {
    let result;

    // Regenerate with feedback if provided
    if (previousSvg && feedback) {
      result = await regenerateSVG(
        postContent,
        styleConfig,
        previousSvg,
        feedback,
        channel.language
      );
    } else {
      result = await generateSVG(postContent, styleConfig, channel.language);
    }

    if (!result) {
      return res.status(500).json({
        success: false,
        error: "SVG generation failed. Please try again.",
      });
    }

    // Normalize SVG dimensions
    const normalizedSvg = normalizeSvgDimensions(result.svg, 1080, 1080);

    // Convert to PNG
    const pngBuffer = await svgToPng(normalizedSvg, { width: 1080, height: 1080 });

    // Upload both SVG and PNG to storage
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
        svg: normalizedSvg,
        svgUrl: `/api/media/${svgPath}`,
        pngUrl: `/api/media/${pngPath}`,
        prompt: result.prompt,
      },
    });
  } catch (error) {
    console.error("SVG generation error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate SVG",
    });
  }
}

export default withAuth(handler);
