import type { NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";
import { editPostWithPrompt } from "@repo/ai";

interface EditWithAIResponse {
  content: string;
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<EditWithAIResponse>>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { user } = req;
  const { channelId, currentContent, editInstruction } = req.body;

  if (!channelId) {
    return res.status(400).json({ success: false, error: "Channel ID is required" });
  }

  if (!currentContent) {
    return res.status(400).json({ success: false, error: "Current content is required" });
  }

  if (!editInstruction) {
    return res.status(400).json({ success: false, error: "Edit instruction is required" });
  }

  // Verify user owns the channel
  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: user.id },
  });

  if (!channel) {
    return res.status(404).json({ success: false, error: "Channel not found" });
  }

  try {
    const editedContent = await editPostWithPrompt(
      currentContent,
      editInstruction,
      channel.language
    );

    return res.status(200).json({
      success: true,
      data: {
        content: editedContent,
      },
    });
  } catch (error) {
    console.error("Edit with AI error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to edit post with AI",
    });
  }
}

export default withAuth(handler);
