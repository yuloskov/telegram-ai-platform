import type { NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";
import type { ContentPlanResponse } from "../index";
import { updateContentPlanSchedule, getContentPlanNextRunTimes } from "~/lib/content-plan-queue";

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<ContentPlanResponse>>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { user } = req;
  const { id: channelId, planId } = req.query;

  if (typeof channelId !== "string" || typeof planId !== "string") {
    return res.status(400).json({ success: false, error: "Invalid IDs" });
  }

  // Verify channel ownership
  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: user.id },
  });

  if (!channel) {
    return res.status(404).json({ success: false, error: "Channel not found" });
  }

  // Get the plan
  const plan = await prisma.contentPlan.findFirst({
    where: { id: planId, channelId },
  });

  if (!plan) {
    return res.status(404).json({ success: false, error: "Content plan not found" });
  }

  // Toggle the isEnabled status
  const updated = await prisma.contentPlan.update({
    where: { id: planId },
    data: { isEnabled: !plan.isEnabled },
    include: {
      contentSources: {
        include: {
          contentSource: {
            select: { telegramUsername: true },
          },
        },
      },
    },
  });

  // Update the scheduled job based on new enabled status
  try {
    await updateContentPlanSchedule(
      updated.id,
      updated.cronSchedule,
      updated.timezone,
      updated.isEnabled
    );
  } catch (error) {
    console.error("Failed to update content plan schedule:", error);
  }

  // Get updated next run time
  const nextRunTimes = await getContentPlanNextRunTimes();
  const nextRunAt = nextRunTimes.get(updated.id);

  return res.status(200).json({
    success: true,
    data: {
      id: updated.id,
      name: updated.name,
      promptTemplate: updated.promptTemplate,
      isEnabled: updated.isEnabled,
      cronSchedule: updated.cronSchedule,
      timezone: updated.timezone,
      publishMode: updated.publishMode,
      imageEnabled: updated.imageEnabled,
      imageType: updated.imageType,
      svgThemeColor: updated.svgThemeColor,
      svgBackgroundStyle: updated.svgBackgroundStyle,
      svgFontStyle: updated.svgFontStyle,
      svgStylePrompt: updated.svgStylePrompt,
      toneOverride: updated.toneOverride,
      languageOverride: updated.languageOverride,
      lookbackDays: updated.lookbackDays,
      lookbackPostCount: updated.lookbackPostCount,
      topicsToAvoid: updated.topicsToAvoid,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      nextRunAt: nextRunAt ? new Date(nextRunAt).toISOString() : null,
      contentSources: updated.contentSources.map((cs) => ({
        id: cs.id,
        contentSourceId: cs.contentSourceId,
        telegramUsername: cs.contentSource.telegramUsername,
      })),
    },
  });
}

export default withAuth(handler);
