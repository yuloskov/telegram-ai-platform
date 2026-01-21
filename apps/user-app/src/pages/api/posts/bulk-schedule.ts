import type { NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";

const BulkScheduleSchema = z.object({
  postIds: z.array(z.string()).min(1),
  scheduledAt: z.string(),
});

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<{ scheduled: number }>>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { user } = req;

  const parseResult = BulkScheduleSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: parseResult.error.errors[0]?.message ?? "Validation error",
    });
  }

  const { postIds, scheduledAt } = parseResult.data;

  // Validate the date
  const scheduledDate = new Date(scheduledAt);
  if (isNaN(scheduledDate.getTime())) {
    return res.status(400).json({
      success: false,
      error: "Invalid date format",
    });
  }

  // Must be at least 1 minute in the future
  const minScheduleTime = new Date(Date.now() + 60 * 1000);
  if (scheduledDate < minScheduleTime) {
    return res.status(400).json({
      success: false,
      error: "Scheduled time must be at least 1 minute in the future",
    });
  }

  // Find all posts that belong to user and can be scheduled
  const posts = await prisma.post.findMany({
    where: {
      id: { in: postIds },
      status: { in: ["draft", "failed", "scheduled"] },
      channel: { userId: user.id },
    },
  });

  if (posts.length === 0) {
    return res.status(400).json({
      success: false,
      error: "No schedulable posts found",
    });
  }

  const idsToSchedule = posts.map((p) => p.id);

  // Update all posts to scheduled status with the scheduled time
  await prisma.post.updateMany({
    where: { id: { in: idsToSchedule } },
    data: {
      status: "scheduled",
      scheduledAt: scheduledDate,
    },
  });

  return res.status(200).json({
    success: true,
    data: { scheduled: posts.length },
  });
}

export default withAuth(handler);
