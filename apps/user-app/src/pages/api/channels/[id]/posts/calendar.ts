import type { NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";

const CalendarQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  contentPlanId: z.string().optional(),
});

interface CalendarPostResponse {
  id: string;
  content: string;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  skippedAt: string | null;
  contentPlanId: string | null;
  contentPlanName: string | null;
  mediaFiles: { id: string; url: string; type: string; isGenerated: boolean }[];
}

interface CalendarResponse {
  dates: Record<string, CalendarPostResponse[]>;
  totalPosts: number;
  skippedCount: number;
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<CalendarResponse>>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { user } = req;
  const { id: channelId } = req.query;

  if (typeof channelId !== "string") {
    return res.status(400).json({ success: false, error: "Invalid channel ID" });
  }

  // Verify channel ownership
  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: user.id },
  });

  if (!channel) {
    return res.status(404).json({ success: false, error: "Channel not found" });
  }

  // Parse query params
  const queryParams = CalendarQuerySchema.safeParse(req.query);
  if (!queryParams.success) {
    return res.status(400).json({
      success: false,
      error: queryParams.error.errors.map((e) => e.message).join(", "),
    });
  }

  const { startDate, endDate, contentPlanId } = queryParams.data;

  // Default to current month if no dates provided
  const now = new Date();
  const start = startDate
    ? new Date(startDate)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = endDate
    ? new Date(endDate)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Build where clause
  const where = {
    channelId,
    OR: [
      // Posts scheduled within the date range
      {
        scheduledAt: {
          gte: start,
          lte: end,
        },
      },
      // Posts published within the date range
      {
        publishedAt: {
          gte: start,
          lte: end,
        },
      },
      // Posts skipped within the date range
      {
        skippedAt: {
          gte: start,
          lte: end,
        },
      },
    ],
    ...(contentPlanId && { contentPlanId }),
  };

  // Fetch posts
  const posts = await prisma.post.findMany({
    where,
    include: {
      mediaFiles: {
        select: {
          id: true,
          url: true,
          type: true,
          isGenerated: true,
        },
      },
      contentPlan: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      { scheduledAt: "asc" },
      { publishedAt: "asc" },
      { createdAt: "asc" },
    ],
  });

  // Group posts by date
  const dates: Record<string, CalendarPostResponse[]> = {};
  let skippedCount = 0;

  for (const post of posts) {
    // Determine which date to use for grouping
    const dateKey = getPostDate(post);
    if (!dateKey) continue;

    if (post.skippedAt) {
      skippedCount++;
    }

    if (!dates[dateKey]) {
      dates[dateKey] = [];
    }

    dates[dateKey].push({
      id: post.id,
      content: post.content,
      status: post.status,
      scheduledAt: post.scheduledAt?.toISOString() ?? null,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      skippedAt: post.skippedAt?.toISOString() ?? null,
      contentPlanId: post.contentPlanId,
      contentPlanName: post.contentPlan?.name ?? null,
      mediaFiles: post.mediaFiles,
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      dates,
      totalPosts: posts.length,
      skippedCount,
    },
  });
}

/**
 * Get the date key (YYYY-MM-DD) for a post based on its status
 */
function getPostDate(post: {
  scheduledAt: Date | null;
  publishedAt: Date | null;
  skippedAt: Date | null;
  createdAt: Date;
}): string | null {
  // Priority: scheduledAt > publishedAt > skippedAt > createdAt
  const date = post.scheduledAt ?? post.publishedAt ?? post.skippedAt ?? post.createdAt;
  if (!date) return null;

  return date.toISOString().split("T")[0]!;
}

export default withAuth(handler);
