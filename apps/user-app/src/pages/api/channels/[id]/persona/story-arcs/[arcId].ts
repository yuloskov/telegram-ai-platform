import type { NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";

interface StoryArcResponse {
  id: string;
  title: string;
  description: string;
  activeDate: string;
  endDate: string | null;
  isUsed: boolean;
  sortOrder: number;
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<StoryArcResponse>>
) {
  const { user } = req;
  const { id: channelId, arcId } = req.query;

  if (typeof channelId !== "string" || typeof arcId !== "string") {
    return res.status(400).json({ success: false, error: "Invalid IDs" });
  }

  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: user.id },
  });

  if (!channel) {
    return res.status(404).json({ success: false, error: "Channel not found" });
  }

  const arc = await prisma.storyArc.findFirst({
    where: { id: arcId, channelId },
  });

  if (!arc) {
    return res.status(404).json({ success: false, error: "Story arc not found" });
  }

  if (req.method === "PATCH") {
    const { title, description, activeDate, endDate, isUsed } = req.body;

    const updated = await prisma.storyArc.update({
      where: { id: arcId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(activeDate !== undefined && { activeDate: new Date(activeDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(isUsed !== undefined && { isUsed }),
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        activeDate: updated.activeDate.toISOString(),
        endDate: updated.endDate?.toISOString() ?? null,
        isUsed: updated.isUsed,
        sortOrder: updated.sortOrder,
      },
    });
  }

  if (req.method === "DELETE") {
    await prisma.storyArc.delete({ where: { id: arcId } });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withAuth(handler);
