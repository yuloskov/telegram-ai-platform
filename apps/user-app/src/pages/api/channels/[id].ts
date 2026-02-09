import type { NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";

interface ChannelResponse {
  id: string;
  telegramId: string;
  username: string | null;
  title: string;
  niche: string | null;
  tone: string;
  language: string;
  hashtags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // SVG settings
  svgEnabled: boolean;
  svgStylePrompt: string | null;
  svgThemeColor: string;
  svgTextColor: string;
  svgBackgroundStyle: string;
  svgFontStyle: string;
  // Personal blog settings
  channelMode: string;
  personaName: string | null;
  personaDescription: string | null;
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<ChannelResponse>>
) {
  const { user } = req;
  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ success: false, error: "Invalid channel ID" });
  }

  // Get the channel and verify ownership
  const channel = await prisma.channel.findFirst({
    where: {
      id,
      userId: user.id,
    },
  });

  if (!channel) {
    return res.status(404).json({ success: false, error: "Channel not found" });
  }

  if (req.method === "GET") {
    return res.status(200).json({
      success: true,
      data: {
        id: channel.id,
        telegramId: channel.telegramId.toString(),
        username: channel.username,
        title: channel.title,
        niche: channel.niche,
        tone: channel.tone,
        language: channel.language,
        hashtags: channel.hashtags,
        isActive: channel.isActive,
        createdAt: channel.createdAt.toISOString(),
        updatedAt: channel.updatedAt.toISOString(),
        svgEnabled: channel.svgEnabled,
        svgStylePrompt: channel.svgStylePrompt,
        svgThemeColor: channel.svgThemeColor,
        svgTextColor: channel.svgTextColor,
        svgBackgroundStyle: channel.svgBackgroundStyle,
        svgFontStyle: channel.svgFontStyle,
        channelMode: channel.channelMode,
        personaName: channel.personaName,
        personaDescription: channel.personaDescription,
      },
    });
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    const {
      title,
      niche,
      tone,
      language,
      hashtags,
      svgEnabled,
      svgStylePrompt,
      svgThemeColor,
      svgTextColor,
      svgBackgroundStyle,
      svgFontStyle,
      channelMode,
      personaName,
      personaDescription,
    } = req.body;

    const updated = await prisma.channel.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(niche !== undefined && { niche }),
        ...(tone && { tone }),
        ...(language && { language }),
        ...(hashtags && { hashtags }),
        ...(svgEnabled !== undefined && { svgEnabled }),
        ...(svgStylePrompt !== undefined && { svgStylePrompt }),
        ...(svgThemeColor && { svgThemeColor }),
        ...(svgTextColor && { svgTextColor }),
        ...(svgBackgroundStyle && { svgBackgroundStyle }),
        ...(svgFontStyle && { svgFontStyle }),
        ...(channelMode && { channelMode }),
        ...(personaName !== undefined && { personaName }),
        ...(personaDescription !== undefined && { personaDescription }),
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        id: updated.id,
        telegramId: updated.telegramId.toString(),
        username: updated.username,
        title: updated.title,
        niche: updated.niche,
        tone: updated.tone,
        language: updated.language,
        hashtags: updated.hashtags,
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        svgEnabled: updated.svgEnabled,
        svgStylePrompt: updated.svgStylePrompt,
        svgThemeColor: updated.svgThemeColor,
        svgTextColor: updated.svgTextColor,
        svgBackgroundStyle: updated.svgBackgroundStyle,
        svgFontStyle: updated.svgFontStyle,
        channelMode: updated.channelMode,
        personaName: updated.personaName,
        personaDescription: updated.personaDescription,
      },
    });
  }

  if (req.method === "DELETE") {
    // Soft delete by setting isActive to false
    await prisma.channel.update({
      where: { id },
      data: { isActive: false },
    });

    return res.status(200).json({
      success: true,
      message: "Channel deleted successfully",
    });
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withAuth(handler);
