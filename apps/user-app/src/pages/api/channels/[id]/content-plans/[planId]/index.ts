import type { NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";
import type { ContentPlanResponse } from "../index";
import { updateContentPlanSchedule, removeContentPlanJob, getContentPlanNextRunTimes } from "~/lib/content-plan-queue";

const UpdateContentPlanSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  promptTemplate: z.string().min(1, "Prompt template is required").optional(),
  isEnabled: z.boolean().optional(),
  cronSchedule: z.string().optional(),
  timezone: z.string().optional(),
  publishMode: z.enum(["auto_publish", "review_first", "draft_only"]).optional(),
  selectionStrategy: z.enum(["recent", "random"]).optional(),
  selectionCount: z.number().int().min(1).max(20).optional(),
  imageEnabled: z.boolean().optional(),
  imageType: z.string().optional(),
  svgThemeColor: z.string().optional(),
  svgBackgroundStyle: z.string().optional(),
  svgFontStyle: z.string().optional(),
  svgStylePrompt: z.string().nullable().optional(),
  toneOverride: z.string().nullable().optional(),
  languageOverride: z.string().nullable().optional(),
  lookbackDays: z.number().int().min(1).max(365).optional(),
  lookbackPostCount: z.number().int().min(1).max(500).optional(),
  topicsToAvoid: z.array(z.string()).optional(),
  contentSourceIds: z.array(z.string()).optional(),
});

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<ContentPlanResponse>>
) {
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

  if (!plan) {
    return res.status(404).json({ success: false, error: "Content plan not found" });
  }

  if (req.method === "GET") {
    const nextRunTimes = await getContentPlanNextRunTimes();
    return res.status(200).json({
      success: true,
      data: formatPlanResponse(plan, nextRunTimes.get(plan.id)),
    });
  }

  if (req.method === "PUT") {
    const parseResult = UpdateContentPlanSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.errors.map((e) => e.message).join(", "),
      });
    }

    const { contentSourceIds, ...planData } = parseResult.data;

    // If content sources are being updated, verify they belong to this channel
    if (contentSourceIds !== undefined && contentSourceIds.length > 0) {
      const validSources = await prisma.contentSource.count({
        where: {
          id: { in: contentSourceIds },
          channelId,
        },
      });

      if (validSources !== contentSourceIds.length) {
        return res.status(400).json({
          success: false,
          error: "One or more content sources are invalid",
        });
      }
    }

    // Update plan and sources in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Update plan data
      const updatedPlan = await tx.contentPlan.update({
        where: { id: planId },
        data: planData,
      });

      // Update content sources if provided
      if (contentSourceIds !== undefined) {
        // Remove existing sources
        await tx.contentPlanSource.deleteMany({
          where: { contentPlanId: planId },
        });

        // Add new sources
        if (contentSourceIds.length > 0) {
          await tx.contentPlanSource.createMany({
            data: contentSourceIds.map((sourceId) => ({
              contentPlanId: planId,
              contentSourceId: sourceId,
            })),
          });
        }
      }

      // Fetch updated plan with sources
      return tx.contentPlan.findUnique({
        where: { id: planId },
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
    });

    if (!updated) {
      return res.status(500).json({ success: false, error: "Failed to update plan" });
    }

    // Update the scheduled job if schedule or enabled status changed
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

    return res.status(200).json({
      success: true,
      data: formatPlanResponse(updated, nextRunTimes.get(updated.id)),
    });
  }

  if (req.method === "DELETE") {
    // Remove the scheduled job first
    try {
      await removeContentPlanJob(planId);
    } catch (error) {
      console.error("Failed to remove content plan job:", error);
    }

    await prisma.contentPlan.delete({
      where: { id: planId },
    });

    return res.status(200).json({
      success: true,
      data: formatPlanResponse(plan),
    });
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatPlanResponse(plan: any, nextRunAt?: number): ContentPlanResponse {
  return {
    id: plan.id,
    name: plan.name,
    promptTemplate: plan.promptTemplate,
    isEnabled: plan.isEnabled,
    cronSchedule: plan.cronSchedule,
    timezone: plan.timezone,
    publishMode: plan.publishMode,
    selectionStrategy: plan.selectionStrategy,
    selectionCount: plan.selectionCount,
    imageEnabled: plan.imageEnabled,
    imageType: plan.imageType,
    svgThemeColor: plan.svgThemeColor,
    svgBackgroundStyle: plan.svgBackgroundStyle,
    svgFontStyle: plan.svgFontStyle,
    svgStylePrompt: plan.svgStylePrompt,
    toneOverride: plan.toneOverride,
    languageOverride: plan.languageOverride,
    lookbackDays: plan.lookbackDays,
    lookbackPostCount: plan.lookbackPostCount,
    topicsToAvoid: plan.topicsToAvoid,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    nextRunAt: nextRunAt ? new Date(nextRunAt).toISOString() : null,
    contentSources: plan.contentSources.map(
      (cs: { id: string; contentSourceId: string; contentSource: { telegramUsername: string } }) => ({
        id: cs.id,
        contentSourceId: cs.contentSourceId,
        telegramUsername: cs.contentSource.telegramUsername,
      })
    ),
  };
}

export default withAuth(handler);
