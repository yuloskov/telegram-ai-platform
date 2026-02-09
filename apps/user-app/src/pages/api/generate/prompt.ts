import type { NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";
import { generateFromPrompt } from "@repo/ai";

interface GenerateResponse {
  content: string;
  suggestedImagePrompt?: string;
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<GenerateResponse>>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { user } = req;
  const { channelId, prompt, additionalInstructions, saveAsDraft } = req.body;

  if (!channelId || !prompt) {
    return res.status(400).json({
      success: false,
      error: "Channel ID and prompt are required",
    });
  }

  // Verify channel ownership
  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: user.id },
  });

  if (!channel) {
    return res.status(404).json({ success: false, error: "Channel not found" });
  }

  try {
    const result = await generateFromPrompt(
      {
        niche: channel.niche ?? undefined,
        tone: channel.tone,
        language: channel.language,
        hashtags: channel.hashtags,
        channelMode: channel.channelMode,
        personaName: channel.personaName ?? undefined,
        personaDescription: channel.personaDescription ?? undefined,
      },
      prompt,
      additionalInstructions
    );

    // Optionally save as draft
    if (saveAsDraft) {
      await prisma.post.create({
        data: {
          channelId,
          content: result.content,
          status: "draft",
          generationType: "from_prompt",
          generationPrompt: prompt,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        content: result.content,
        suggestedImagePrompt: result.suggestedImagePrompt,
      },
    });
  } catch (error) {
    console.error("Generation error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate content",
    });
  }
}

export default withAuth(handler);
