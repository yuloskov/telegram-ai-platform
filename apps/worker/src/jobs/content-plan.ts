import { prisma } from "@repo/database";
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import parser from "cron-parser";
import {
  generateMultiplePostsWithImages,
  generateSVG,
  generateImagePromptFromContent,
  generateImage,
  type SVGStyleConfig,
} from "@repo/ai";
import { svgToPng } from "@repo/shared/svg";
import { uploadFile, getFileBuffer } from "@repo/shared/storage";
import {
  QUEUE_NAMES,
  PUBLISHING_JOB_OPTIONS,
  type ContentPlanJobPayload,
  type PublishingJobPayload,
} from "@repo/shared/queues";
import { sendPendingReviewNotification } from "@repo/telegram-bot/bot";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

/**
 * Handle content plan execution job
 */
export async function handleContentPlanJob(data: ContentPlanJobPayload): Promise<void> {
  const { contentPlanId } = data;

  console.log(`Executing content plan: ${contentPlanId}`);

  // Fetch content plan with all related data
  const plan = await prisma.contentPlan.findUnique({
    where: { id: contentPlanId },
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
    throw new Error(`Content plan not found: ${contentPlanId}`);
  }

  if (!plan.isEnabled) {
    console.log(`Content plan ${contentPlanId} is disabled, skipping`);
    return;
  }

  const { channel } = plan;

  // Check if there's already a post from this plan scheduled at this exact time
  // This can happen if user used "Generate Now" to pre-generate posts
  const currentScheduledTime = getCurrentScheduledTime(plan.cronSchedule, plan.timezone);
  if (currentScheduledTime) {
    const existingPost = await prisma.post.findFirst({
      where: {
        contentPlanId: plan.id,
        scheduledAt: currentScheduledTime,
      },
      select: { id: true },
    });

    if (existingPost) {
      console.log(
        `Content plan ${contentPlanId}: Post already exists for scheduled time ${currentScheduledTime.toISOString()}, skipping generation`
      );
      return;
    }
  }

  // Get previous posts from THIS content plan for context (to avoid repetition)
  // Only consider published posts - drafts/pending/failed posts shouldn't be treated as previous content
  const previousPosts = await prisma.post.findMany({
    where: {
      contentPlanId: plan.id,
      status: "published",
    },
    orderBy: { createdAt: "desc" },
    take: plan.lookbackPostCount,
    select: { content: true },
  });

  console.log(`Found ${previousPosts.length} previous posts from this content plan for context`);

  // Get scraped content from selected sources
  const sourceIds = plan.contentSources.map((s) => s.contentSourceId);
  let scrapedContent: { id: string; text: string | null; views: number; mediaUrls: string[] }[] = [];

  if (sourceIds.length > 0) {
    if (plan.selectionStrategy === "random") {
      // For random selection, fetch more items then randomly select
      const allContent = await prisma.scrapedContent.findMany({
        where: {
          sourceId: { in: sourceIds },
          usedForGeneration: false,
        },
        select: {
          id: true,
          text: true,
          views: true,
          mediaUrls: true,
        },
      });

      // Fisher-Yates shuffle and take selectionCount items
      const shuffled = [...allContent];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
      }
      scrapedContent = shuffled.slice(0, plan.selectionCount);
      console.log(`Randomly selected ${scrapedContent.length} content items from ${allContent.length} available`);
    } else {
      // Default: recent selection strategy
      scrapedContent = await prisma.scrapedContent.findMany({
        where: {
          sourceId: { in: sourceIds },
          usedForGeneration: false,
        },
        orderBy: { scrapedAt: "desc" },
        take: 20, // Get recent unused content
        select: {
          id: true,
          text: true,
          views: true,
          mediaUrls: true,
        },
      });
    }
  }

  console.log(`Found ${scrapedContent.length} scraped content items (strategy: ${plan.selectionStrategy})`);

  // If no scraped content and no custom prompt, skip
  if (scrapedContent.length === 0 && !plan.promptTemplate) {
    console.log(`No content sources or prompt template for plan ${contentPlanId}, skipping`);
    return;
  }

  // Build channel context
  const channelContext = {
    niche: channel.niche ?? undefined,
    tone: plan.toneOverride ?? channel.tone,
    language: plan.languageOverride ?? channel.language,
    hashtags: channel.hashtags,
  };

  // Generate post using AI
  try {
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
      1 // Generate one post per execution
    );

    if (result.posts.length === 0) {
      console.log(`No posts generated for plan ${contentPlanId}`);
      return;
    }

    const generatedPost = result.posts[0]!;

    // Handle image generation if enabled
    let mediaUrls: string[] = [];

    if (plan.imageEnabled) {
      console.log(`[Content Plan ${contentPlanId}] Image generation enabled, type: ${plan.imageType}`);
      if (plan.imageType === "svg") {
        // Generate SVG image
        const svgStyleConfig: SVGStyleConfig = {
          stylePrompt: plan.svgStylePrompt || undefined,
          themeColor: plan.svgThemeColor,
          textColor: "#1F2937", // Default text color
          backgroundStyle: plan.svgBackgroundStyle as "solid" | "gradient" | "transparent",
          fontStyle: plan.svgFontStyle as "modern" | "classic" | "playful" | "technical",
        };

        console.log(`[Content Plan ${contentPlanId}] Generating SVG...`);
        const svgResult = await generateSVG(
          generatedPost.content,
          svgStyleConfig,
          channelContext.language
        );

        if (svgResult) {
          console.log(`[Content Plan ${contentPlanId}] SVG generated, converting to PNG...`);
          const pngBuffer = await svgToPng(svgResult.svg, { width: 1080, height: 1080 });
          console.log(`[Content Plan ${contentPlanId}] PNG buffer size: ${pngBuffer.length} bytes`);
          const timestamp = Date.now();
          const pngObjectName = `svg-png/${channel.id}/${timestamp}.png`;
          const svgObjectName = `svg/${channel.id}/${timestamp}.svg`;

          await Promise.all([
            uploadFile("telegram-platform", pngObjectName, pngBuffer, "image/png"),
            uploadFile("telegram-platform", svgObjectName, Buffer.from(svgResult.svg, "utf-8"), "image/svg+xml"),
          ]);
          console.log(`[Content Plan ${contentPlanId}] Images uploaded to MinIO`);

          mediaUrls.push(`/api/media/telegram-platform/${pngObjectName}`);
        } else {
          console.warn(`[Content Plan ${contentPlanId}] generateSVG returned null - AI may have failed to generate valid SVG`);
        }
      } else {
        // Generate raster image
        console.log(`[Content Plan ${contentPlanId}] Generating image prompt...`);
        const imagePrompt = await generateImagePromptFromContent(
          generatedPost.content,
          channelContext.language
        );

        if (imagePrompt) {
          console.log(`[Content Plan ${contentPlanId}] Generating raster image...`);
          const imageData = await generateImage(imagePrompt);
          if (imageData) {
            const buffer = Buffer.from(
              imageData.replace(/^data:image\/\w+;base64,/, ""),
              "base64"
            );
            console.log(`[Content Plan ${contentPlanId}] Raster image buffer size: ${buffer.length} bytes`);
            const timestamp = Date.now();
            const objectName = `generated/${channel.id}/${timestamp}.jpg`;
            await uploadFile("telegram-platform", objectName, buffer, "image/jpeg");
            console.log(`[Content Plan ${contentPlanId}] Raster image uploaded to MinIO`);

            mediaUrls.push(`/api/media/telegram-platform/${objectName}`);
          } else {
            console.warn(`[Content Plan ${contentPlanId}] generateImage returned null`);
          }
        } else {
          console.warn(`[Content Plan ${contentPlanId}] generateImagePromptFromContent returned null`);
        }
      }
    } else {
      console.log(`[Content Plan ${contentPlanId}] Image generation disabled`);
    }

    // Determine initial post status based on publish mode
    let postStatus: "draft" | "pending_review" | "publishing";
    switch (plan.publishMode) {
      case "auto_publish":
        postStatus = "publishing";
        break;
      case "review_first":
        postStatus = "pending_review";
        break;
      case "draft_only":
      default:
        postStatus = "draft";
        break;
    }

    // Create post in database
    const post = await prisma.post.create({
      data: {
        channelId: channel.id,
        contentPlanId: plan.id,
        content: generatedPost.content,
        status: postStatus,
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
    });

    console.log(`Created post ${post.id} with status ${postStatus}`);

    // Mark scraped content as used
    if (generatedPost.sourceIds.length > 0) {
      await prisma.scrapedContent.updateMany({
        where: { id: { in: generatedPost.sourceIds } },
        data: { usedForGeneration: true },
      });
    }

    // If review_first, create PendingReview and send notification
    if (plan.publishMode === "review_first" && channel.user.telegramId) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      // Fetch image buffer if there's media
      let imageBuffer: Buffer | undefined;
      console.log(`[v2] mediaUrls for notification:`, mediaUrls);
      if (mediaUrls.length > 0) {
        try {
          // Parse the URL format: /api/media/{bucket}/{objectName}
          const mediaUrl = mediaUrls[0]!;
          console.log(`Parsing mediaUrl: ${mediaUrl}`);
          const match = mediaUrl.match(/^\/api\/media\/([^/]+)\/(.+)$/);
          console.log(`Regex match result:`, match);
          if (match) {
            const [, bucket, objectName] = match;
            console.log(`Fetching image from bucket: ${bucket}, objectName: ${objectName}`);
            imageBuffer = await getFileBuffer(bucket!, objectName!);
            console.log(`Image buffer size: ${imageBuffer.length} bytes`);
          } else {
            console.error(`Failed to parse mediaUrl: ${mediaUrl}`);
          }
        } catch (err) {
          console.error("Failed to fetch image for notification:", err);
        }
      } else {
        console.log(`No media URLs available for notification`);
      }

      const messageId = await sendPendingReviewNotification(
        channel.user.telegramId.toString(),
        post.id,
        channel.title,
        generatedPost.content,
        (channelContext.language as "en" | "ru") ?? "en",
        imageBuffer
      );

      await prisma.pendingReview.create({
        data: {
          postId: post.id,
          telegramMessageId: BigInt(messageId),
          expiresAt,
        },
      });

      console.log(`Sent pending review notification for post ${post.id}`);
    }

    // If auto-publish, queue the publishing job
    if (plan.publishMode === "auto_publish") {
      const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
      const publishQueue = new Queue<PublishingJobPayload>(QUEUE_NAMES.PUBLISHING, {
        connection,
      });

      await publishQueue.add(
        `publish-${post.id}`,
        {
          postId: post.id,
          channelTelegramId: channel.telegramId.toString(),
        },
        PUBLISHING_JOB_OPTIONS
      );

      await publishQueue.close();
      await connection.quit();

      console.log(`Queued post ${post.id} for publishing`);
    }

    console.log(`Content plan ${contentPlanId} executed successfully`);
  } catch (error) {
    console.error(`Content plan ${contentPlanId} execution failed:`, error);
    throw error;
  }
}

/**
 * Get the current scheduled time based on cron expression.
 * This determines what time slot triggered the current job execution.
 */
function getCurrentScheduledTime(cronSchedule: string, timezone: string): Date | null {
  try {
    // Parse cron with current time, then get the previous occurrence
    // This gives us the scheduled time that triggered this job
    const interval = parser.parse(cronSchedule, {
      currentDate: new Date(),
      tz: timezone,
    });

    // Get the previous scheduled time (the one that just triggered)
    const prev = interval.prev();
    return prev.toDate();
  } catch (error) {
    console.error("Failed to parse cron schedule:", error);
    return null;
  }
}
