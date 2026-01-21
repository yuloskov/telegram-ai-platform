import type { NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";

const ScheduleSchema = z.object({
  scheduledAt: z.string().nullable(),
});

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { user } = req;
  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ success: false, error: "Invalid post ID" });
  }

  // Validate request body
  const parseResult = ScheduleSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: parseResult.error.errors[0]?.message ?? "Invalid request body",
    });
  }

  const { scheduledAt } = parseResult.data;

  // Get the post and verify ownership
  const post = await prisma.post.findFirst({
    where: {
      id,
      channel: { userId: user.id },
    },
  });

  if (!post) {
    return res.status(404).json({ success: false, error: "Post not found" });
  }

  // Can only schedule drafts, failed, or reschedule scheduled posts
  if (!["draft", "failed", "scheduled"].includes(post.status)) {
    return res.status(400).json({
      success: false,
      error: "Can only schedule posts that are drafts, failed, or already scheduled",
    });
  }

  // Unschedule: set scheduledAt to null and status back to draft
  if (scheduledAt === null) {
    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        status: "draft",
        scheduledAt: null,
      },
    });

    return res.status(200).json({
      success: true,
      data: updatedPost,
    });
  }

  // Schedule: validate the date and update
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

  const updatedPost = await prisma.post.update({
    where: { id },
    data: {
      status: "scheduled",
      scheduledAt: scheduledDate,
    },
  });

  return res.status(200).json({
    success: true,
    data: updatedPost,
  });
}

export default withAuth(handler);
