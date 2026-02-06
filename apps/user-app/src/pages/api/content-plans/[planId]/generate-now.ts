import type { NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";
import { CronExpressionParser } from "cron-parser";
import {
  generateMultiplePostsWithImages,
  generateSVG,
  type SVGStyleConfig,
} from "@repo/ai";
import { svgToPng } from "@repo/shared/svg";
import { uploadFile } from "@repo/shared/storage";

const GenerateNowSchema = z.object({
  count: z.number().int().min(1).max(10).default(3),
});

interface GeneratedPostResponse {
  id: string;
  content: string;
  status: string;
  scheduledAt: string | null;
  mediaFiles: { id: string; url: string; type: string; isGenerated: boolean }[];
}

interface GenerateNowResponse {
  posts: GeneratedPostResponse[];
  scheduledTimes: string[];
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<GenerateNowResponse>>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { user } = req;
  const { planId } = req.query;

  if (typeof planId !== "string") {
    return res.status(400).json({ success: false, error: "Invalid plan ID" });
  }

  const parseResult = GenerateNowSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: parseResult.error.errors.map((e) => e.message).join(", "),
    });
  }

  const { count } = parseResult.data;

  // Fetch content plan with channel and sources
  const plan = await prisma.contentPlan.findUnique({
    where: { id: planId },
    include: {
      channel: {
        include: { user: true },
      },
      contentSources: {
        include: {
          contentSource: true,
        },
      },
    },
  });

  if (!plan) {
    return res.status(404).json({ success: false, error: "Content plan not found" });
  }

  // Verify ownership
  if (plan.channel.userId !== user.id) {
    return res.status(403).json({ success: false, error: "Access denied" });
  }

  const { channel } = plan;

  // Calculate next N scheduled times from cron expression
  const allScheduledTimes = calculateNextScheduledTimes(
    plan.cronSchedule,
    plan.timezone,
    count * 2 // Get extra times in case some slots are already filled
  );

  // Check which time slots already have posts from this content plan
  const existingPosts = await prisma.post.findMany({
    where: {
      contentPlanId: plan.id,
      scheduledAt: { in: allScheduledTimes },
    },
    select: { scheduledAt: true },
  });

  const existingTimestamps = new Set(
    existingPosts.map((p) => p.scheduledAt?.getTime()).filter(Boolean)
  );

  // Filter out times that already have posts
  const scheduledTimes = allScheduledTimes
    .filter((t) => !existingTimestamps.has(t.getTime()))
    .slice(0, count);

  if (scheduledTimes.length === 0) {
    return res.status(400).json({
      success: false,
      error: "All upcoming time slots already have posts scheduled. Wait for some to be published or increase the schedule frequency.",
    });
  }

  // Get scraped content from sources
  const sourceIds = plan.contentSources.map((s) => s.contentSourceId);
  let scrapedContent: { id: string; text: string | null; views: number; mediaUrls: string[] }[] = [];

  if (sourceIds.length > 0) {
    scrapedContent = await prisma.scrapedContent.findMany({
      where: {
        sourceId: { in: sourceIds },
        usedForGeneration: false,
      },
      orderBy: plan.selectionStrategy === "random" ? undefined : { scrapedAt: "desc" },
      take: plan.selectionCount * count, // Get enough content for multiple posts
      select: {
        id: true,
        text: true,
        views: true,
        mediaUrls: true,
      },
    });

    // Shuffle if random strategy
    if (plan.selectionStrategy === "random") {
      for (let i = scrapedContent.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [scrapedContent[i], scrapedContent[j]] = [scrapedContent[j]!, scrapedContent[i]!];
      }
    }
  }

  // Get previous posts for context
  const previousPosts = await prisma.post.findMany({
    where: {
      contentPlanId: plan.id,
      status: "published",
    },
    orderBy: { createdAt: "desc" },
    take: plan.lookbackPostCount,
    select: { content: true },
  });

  // Build channel context
  const channelContext = {
    niche: channel.niche ?? undefined,
    tone: plan.toneOverride ?? channel.tone,
    language: plan.languageOverride ?? channel.language,
    hashtags: channel.hashtags,
  };

  try {
    // Generate posts using AI
    const result = await generateMultiplePostsWithImages(
      channelContext,
      scrapedContent.map((c) => {
        const imageUrls = c.mediaUrls.filter((url) => !url.startsWith("skipped:"));
        return {
          id: c.id,
          text: c.text,
          views: c.views,
          hasImages: imageUrls.length > 0,
          imageCount: imageUrls.length,
        };
      }),
      previousPosts.map((p) => p.content),
      plan.promptTemplate || undefined,
      count
    );

    if (result.posts.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No posts could be generated. Try adding more source content.",
      });
    }

    // Create posts with scheduled times
    const createdPosts: GeneratedPostResponse[] = [];
    const usedSourceIds: string[] = [];

    for (let i = 0; i < result.posts.length && i < scheduledTimes.length; i++) {
      const generatedPost = result.posts[i]!;
      const scheduledAt = scheduledTimes[i]!;

      // Generate image if enabled
      let mediaUrls: string[] = [];

      if (plan.imageEnabled && plan.imageType === "svg") {
        const svgStyleConfig: SVGStyleConfig = {
          stylePrompt: plan.svgStylePrompt || undefined,
          themeColor: plan.svgThemeColor,
          textColor: "#1F2937",
          backgroundStyle: plan.svgBackgroundStyle as "solid" | "gradient" | "transparent",
          fontStyle: plan.svgFontStyle as "modern" | "classic" | "playful" | "technical",
        };

        const svgResult = await generateSVG(
          generatedPost.content,
          svgStyleConfig,
          channelContext.language
        );

        if (svgResult) {
          const pngBuffer = await svgToPng(svgResult.svg, { width: 1080, height: 1080 });
          const timestamp = Date.now() + i;
          const pngObjectName = `svg-png/${channel.id}/${timestamp}.png`;
          const svgObjectName = `svg/${channel.id}/${timestamp}.svg`;

          await Promise.all([
            uploadFile("telegram-platform", pngObjectName, pngBuffer, "image/png"),
            uploadFile("telegram-platform", svgObjectName, Buffer.from(svgResult.svg, "utf-8"), "image/svg+xml"),
          ]);

          mediaUrls.push(`/api/media/telegram-platform/${pngObjectName}`);
        }
      }

      // Determine post status based on plan's publishMode
      const postStatus = getPostStatusFromPublishMode(plan.publishMode);
      // Set scheduledAt for both "scheduled" and "pending_review" posts
      // so they appear in the calendar. Only "draft" posts have no scheduledAt.
      const shouldSetScheduledAt = postStatus !== "draft";

      // Create the post
      const post = await prisma.post.create({
        data: {
          channelId: channel.id,
          contentPlanId: plan.id,
          content: generatedPost.content,
          status: postStatus,
          generationType: "from_scraped",
          scheduledAt: shouldSetScheduledAt ? new Date(scheduledAt) : null,
          isAutoGenerated: true,
          mediaFiles: {
            create: mediaUrls.map((url, index) => {
              const filename = url.split("/").pop() || `image_${index}.png`;
              return {
                url,
                type: "image",
                filename,
                isGenerated: true,
              };
            }),
          },
        },
        include: { mediaFiles: true },
      });

      usedSourceIds.push(...generatedPost.sourceIds);

      createdPosts.push({
        id: post.id,
        content: post.content,
        status: post.status,
        scheduledAt: post.scheduledAt?.toISOString() ?? null,
        mediaFiles: post.mediaFiles.map((mf) => ({
          id: mf.id,
          url: mf.url,
          type: mf.type,
          isGenerated: mf.isGenerated,
        })),
      });
    }

    // Mark scraped content as used
    if (usedSourceIds.length > 0) {
      const uniqueSourceIds = [...new Set(usedSourceIds)];
      await prisma.scrapedContent.updateMany({
        where: { id: { in: uniqueSourceIds } },
        data: { usedForGeneration: true },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        posts: createdPosts,
        scheduledTimes: scheduledTimes.map((t) => t.toISOString()),
      },
    });
  } catch (error) {
    console.error("Generate-now error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate posts",
    });
  }
}

/**
 * Determine post status based on content plan's publish mode
 */
function getPostStatusFromPublishMode(
  publishMode: "auto_publish" | "review_first" | "draft_only"
): "scheduled" | "pending_review" | "draft" {
  switch (publishMode) {
    case "auto_publish":
      return "scheduled";
    case "review_first":
      return "pending_review";
    case "draft_only":
      return "draft";
  }
}

/**
 * Calculate the next N scheduled times based on cron expression
 */
function calculateNextScheduledTimes(
  cronSchedule: string,
  timezone: string,
  count: number
): Date[] {
  const times: Date[] = [];

  try {
    const interval = CronExpressionParser.parse(cronSchedule, {
      currentDate: new Date(),
      tz: timezone,
    });

    for (let i = 0; i < count; i++) {
      const next = interval.next();
      times.push(next.toDate());
    }
  } catch (error) {
    console.error("Failed to parse cron:", error);
    // Fallback: schedule posts every hour starting from now
    const now = new Date();
    for (let i = 0; i < count; i++) {
      const time = new Date(now.getTime() + (i + 1) * 60 * 60 * 1000);
      times.push(time);
    }
  }

  return times;
}

export default withAuth(handler);
