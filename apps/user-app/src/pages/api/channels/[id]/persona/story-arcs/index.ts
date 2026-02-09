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
  res: NextApiResponse<ApiResponse<StoryArcResponse[] | StoryArcResponse>>
) {
  const { user } = req;
  const { id: channelId } = req.query;

  if (typeof channelId !== "string") {
    return res.status(400).json({ success: false, error: "Invalid channel ID" });
  }

  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: user.id },
  });

  if (!channel) {
    return res.status(404).json({ success: false, error: "Channel not found" });
  }

  if (req.method === "GET") {
    const arcs = await prisma.storyArc.findMany({
      where: { channelId },
      orderBy: { activeDate: "asc" },
    });

    return res.status(200).json({
      success: true,
      data: arcs.map(formatArc),
    });
  }

  if (req.method === "POST") {
    const { title, description, activeDate, endDate } = req.body;

    if (!title || !description || !activeDate) {
      return res.status(400).json({
        success: false,
        error: "Title, description, and active date are required",
      });
    }

    const maxOrder = await prisma.storyArc.aggregate({
      where: { channelId },
      _max: { sortOrder: true },
    });

    const arc = await prisma.storyArc.create({
      data: {
        channelId,
        title,
        description,
        activeDate: new Date(activeDate),
        endDate: endDate ? new Date(endDate) : null,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });

    return res.status(201).json({ success: true, data: formatArc(arc) });
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

function formatArc(arc: {
  id: string;
  title: string;
  description: string;
  activeDate: Date;
  endDate: Date | null;
  isUsed: boolean;
  sortOrder: number;
}): StoryArcResponse {
  return {
    id: arc.id,
    title: arc.title,
    description: arc.description,
    activeDate: arc.activeDate.toISOString(),
    endDate: arc.endDate?.toISOString() ?? null,
    isUsed: arc.isUsed,
    sortOrder: arc.sortOrder,
  };
}

export default withAuth(handler);
