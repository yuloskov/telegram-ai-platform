import type { NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";

const BulkRescheduleSchema = z.object({
  postIds: z.array(z.string()).min(1).max(50),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid start date",
  }),
  intervalMinutes: z.number().int().min(1).optional(),
});

interface RescheduledPostResponse {
  id: string;
  scheduledAt: string;
  status: string;
}

interface BulkRescheduleResponse {
  posts: RescheduledPostResponse[];
  rescheduledCount: number;
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<BulkRescheduleResponse>>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { user } = req;

  const parseResult = BulkRescheduleSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: parseResult.error.errors.map((e) => e.message).join(", "),
    });
  }

  const { postIds, startDate, intervalMinutes } = parseResult.data;

  // Fetch posts with their channels and content plans to verify ownership
  const posts = await prisma.post.findMany({
    where: {
      id: { in: postIds },
    },
    include: {
      channel: {
        select: { userId: true },
      },
      contentPlan: {
        select: {
          cronSchedule: true,
          timezone: true,
        },
      },
    },
    orderBy: { scheduledAt: "asc" },
  });

  // Verify all posts belong to the user
  const unauthorized = posts.find((p) => p.channel.userId !== user.id);
  if (unauthorized) {
    return res.status(403).json({
      success: false,
      error: "Access denied to one or more posts",
    });
  }

  // Calculate the interval to use (default to 60 minutes if not from a content plan)
  let interval = intervalMinutes ?? 60;
  if (!intervalMinutes && posts[0]?.contentPlan?.cronSchedule) {
    // Try to extract interval from cron schedule
    interval = estimateIntervalFromCron(posts[0].contentPlan.cronSchedule);
  }

  // Reschedule posts sequentially starting from startDate
  const startTime = new Date(startDate);
  const rescheduledPosts: RescheduledPostResponse[] = [];

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i]!;
    const newScheduledAt = new Date(startTime.getTime() + i * interval * 60 * 1000);

    await prisma.post.update({
      where: { id: post.id },
      data: {
        scheduledAt: newScheduledAt,
        skippedAt: null, // Clear skippedAt
        status: "scheduled", // Reset status to scheduled
      },
    });

    rescheduledPosts.push({
      id: post.id,
      scheduledAt: newScheduledAt.toISOString(),
      status: "scheduled",
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      posts: rescheduledPosts,
      rescheduledCount: rescheduledPosts.length,
    },
  });
}

/**
 * Estimate the interval in minutes from a cron schedule
 * This is a simple heuristic - complex cron patterns may not be handled well
 */
function estimateIntervalFromCron(cronSchedule: string): number {
  const parts = cronSchedule.split(" ");
  if (parts.length < 5) return 60;

  const [minute, hour] = parts;

  // If specific minutes, assume hourly
  if (minute !== "*" && hour === "*") {
    return 60;
  }

  // If specific hours
  if (hour !== "*") {
    // Count the hours
    const hours = hour!.split(",");
    if (hours.length > 1) {
      // Multiple hours - estimate interval based on first two
      const h1 = parseInt(hours[0]!, 10);
      const h2 = parseInt(hours[1]!, 10);
      if (!isNaN(h1) && !isNaN(h2)) {
        return Math.abs(h2 - h1) * 60;
      }
    }
    // Single hour - assume daily
    return 24 * 60;
  }

  // Default to hourly
  return 60;
}

export default withAuth(handler);
