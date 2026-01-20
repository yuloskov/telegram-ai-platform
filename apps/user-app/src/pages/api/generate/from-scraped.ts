import type { NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";
import { generateFromScrapedContent } from "@repo/ai";

interface GenerateResponse {
  content: string;
  suggestedImagePrompt?: string;
  postId?: string;
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<GenerateResponse>>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { user } = req;
  const { channelId, scrapedContentIds, additionalInstructions, saveAsDraft } = req.body;

  if (!channelId || !scrapedContentIds || !Array.isArray(scrapedContentIds) || scrapedContentIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: "Channel ID and scrapedContentIds array are required",
    });
  }

  // Verify channel ownership
  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: user.id },
  });

  if (!channel) {
    return res.status(404).json({ success: false, error: "Channel not found" });
  }

  // Fetch scraped content
  const scrapedContent = await prisma.scrapedContent.findMany({
    where: {
      id: { in: scrapedContentIds },
      source: {
        channelId,
      },
    },
    select: {
      id: true,
      text: true,
      views: true,
    },
  });

  if (scrapedContent.length === 0) {
    return res.status(404).json({ success: false, error: "No scraped content found" });
  }

  try {
    const result = await generateFromScrapedContent(
      {
        niche: channel.niche ?? undefined,
        tone: channel.tone,
        language: channel.language,
        hashtags: channel.hashtags,
      },
      scrapedContent.map((c) => ({
        text: c.text,
        views: c.views,
      })),
      additionalInstructions
    );

    // Mark scraped content as used for generation
    await prisma.scrapedContent.updateMany({
      where: {
        id: { in: scrapedContent.map((c) => c.id) },
      },
      data: {
        usedForGeneration: true,
      },
    });

    let postId: string | undefined;

    // Optionally save as draft
    if (saveAsDraft) {
      const post = await prisma.post.create({
        data: {
          channelId,
          content: result.content,
          status: "draft",
          generationType: "from_scraped",
          generationPrompt: `Generated from ${scrapedContent.length} scraped posts`,
        },
      });
      postId = post.id;
    }

    return res.status(200).json({
      success: true,
      data: {
        content: result.content,
        suggestedImagePrompt: result.suggestedImagePrompt,
        postId,
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
