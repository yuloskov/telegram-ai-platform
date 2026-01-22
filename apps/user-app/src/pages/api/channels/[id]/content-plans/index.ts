import type { NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";
import { scheduleContentPlan, getContentPlanNextRunTimes } from "~/lib/content-plan-queue";

export interface ContentPlanResponse {
  id: string;
  name: string;
  promptTemplate: string;
  isEnabled: boolean;
  cronSchedule: string;
  timezone: string;
  publishMode: string;
  imageEnabled: boolean;
  imageType: string;
  svgThemeColor: string;
  svgBackgroundStyle: string;
  svgFontStyle: string;
  svgStylePrompt: string | null;
  toneOverride: string | null;
  languageOverride: string | null;
  lookbackDays: number;
  lookbackPostCount: number;
  topicsToAvoid: string[];
  createdAt: string;
  updatedAt: string;
  nextRunAt: string | null;
  contentSources: Array<{
    id: string;
    contentSourceId: string;
    telegramUsername: string;
  }>;
}

const CreateContentPlanSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  promptTemplate: z.string().min(1, "Prompt template is required"),
  cronSchedule: z.string().default("0 9 * * *"),
  timezone: z.string().default("UTC"),
  publishMode: z.enum(["auto_publish", "review_first", "draft_only"]).default("review_first"),
  imageEnabled: z.boolean().default(true),
  imageType: z.string().default("svg"),
  svgThemeColor: z.string().default("#3B82F6"),
  svgBackgroundStyle: z.string().default("gradient"),
  svgFontStyle: z.string().default("modern"),
  svgStylePrompt: z.string().nullable().optional(),
  toneOverride: z.string().nullable().optional(),
  languageOverride: z.string().nullable().optional(),
  lookbackDays: z.number().int().min(1).max(365).default(30),
  lookbackPostCount: z.number().int().min(1).max(500).default(50),
  topicsToAvoid: z.array(z.string()).default([]),
  contentSourceIds: z.array(z.string()).default([]),
});

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<ContentPlanResponse | ContentPlanResponse[]>>
) {
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

  if (req.method === "GET") {
    const [plans, nextRunTimes] = await Promise.all([
      prisma.contentPlan.findMany({
        where: { channelId },
        include: {
          contentSources: {
            include: {
              contentSource: {
                select: { telegramUsername: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      getContentPlanNextRunTimes(),
    ]);

    return res.status(200).json({
      success: true,
      data: plans.map((plan) => formatPlanResponse(plan, nextRunTimes.get(plan.id))),
    });
  }

  if (req.method === "POST") {
    const parseResult = CreateContentPlanSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.errors.map((e) => e.message).join(", "),
      });
    }

    const { contentSourceIds, ...planData } = parseResult.data;

    // Verify all content sources belong to this channel
    if (contentSourceIds.length > 0) {
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

    const plan = await prisma.contentPlan.create({
      data: {
        channelId,
        ...planData,
        contentSources: {
          create: contentSourceIds.map((sourceId) => ({
            contentSourceId: sourceId,
          })),
        },
      },
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

    // Schedule the content plan job if enabled
    if (plan.isEnabled) {
      try {
        await scheduleContentPlan(plan.id, plan.cronSchedule, plan.timezone);
      } catch (error) {
        console.error("Failed to schedule content plan:", error);
      }
    }

    return res.status(201).json({
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
