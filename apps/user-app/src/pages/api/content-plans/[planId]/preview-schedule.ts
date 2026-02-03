import type { NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";
import parser from "cron-parser";

const PreviewScheduleSchema = z.object({
  count: z.number().int().min(1).max(10).default(3),
});

interface PreviewScheduleResponse {
  scheduledTimes: string[];
  cronSchedule: string;
  timezone: string;
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<PreviewScheduleResponse>>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { user } = req;
  const { planId } = req.query;

  if (typeof planId !== "string") {
    return res.status(400).json({ success: false, error: "Invalid plan ID" });
  }

  const parseResult = PreviewScheduleSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: parseResult.error.errors.map((e) => e.message).join(", "),
    });
  }

  const { count } = parseResult.data;

  // Fetch content plan to verify ownership and get schedule
  const plan = await prisma.contentPlan.findUnique({
    where: { id: planId },
    include: {
      channel: true,
    },
  });

  if (!plan) {
    return res.status(404).json({ success: false, error: "Content plan not found" });
  }

  if (plan.channel.userId !== user.id) {
    return res.status(403).json({ success: false, error: "Access denied" });
  }

  // Calculate next N scheduled times from cron expression
  const scheduledTimes: string[] = [];

  try {
    const interval = parser.parse(plan.cronSchedule, {
      currentDate: new Date(),
      tz: plan.timezone,
    });

    for (let i = 0; i < count; i++) {
      const next = interval.next();
      scheduledTimes.push(next.toDate().toISOString());
    }
  } catch (error) {
    console.error("Failed to parse cron:", error);
    // Fallback: schedule posts every hour starting from now
    const now = new Date();
    for (let i = 0; i < count; i++) {
      const time = new Date(now.getTime() + (i + 1) * 60 * 60 * 1000);
      scheduledTimes.push(time.toISOString());
    }
  }

  return res.status(200).json({
    success: true,
    data: {
      scheduledTimes,
      cronSchedule: plan.cronSchedule,
      timezone: plan.timezone,
    },
  });
}

export default withAuth(handler);
