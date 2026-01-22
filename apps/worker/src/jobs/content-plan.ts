import { prisma } from "@repo/database";
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import {
  generateMultiplePostsWithImages,
  generateSVG,
  generateImagePromptFromContent,
  generateImage,
  type SVGStyleConfig,
} from "@repo/ai";
import { svgToPng } from "@repo/shared/svg";
import { uploadFile } from "@repo/shared/storage";
import {
  QUEUE_NAMES,
  PUBLISHING_JOB_OPTIONS,
  type ContentPlanJobPayload,
  type PublishingJobPayload,
} from "@repo/shared/queues";

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

  // Get previous posts from THIS content plan for context (to avoid repetition)
  const previousPosts = await prisma.post.findMany({
    where: {
      contentPlanId: plan.id,
    },
    orderBy: { createdAt: "desc" },
    take: plan.lookbackPostCount,
    select: { content: true },
  });

  console.log(`Found ${previousPosts.length} previous posts from this content plan for context`);

  // Get scraped content from selected sources
  const sourceIds = plan.contentSources.map((s) => s.contentSourceId);
  const scrapedContent = sourceIds.length > 0
    ? await prisma.scrapedContent.findMany({
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
      })
    : [];

  console.log(`Found ${scrapedContent.length} scraped content items`);

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
      if (plan.imageType === "svg") {
        // Generate SVG image
        const svgStyleConfig: SVGStyleConfig = {
          stylePrompt: plan.svgStylePrompt || undefined,
          themeColor: plan.svgThemeColor,
          textColor: "#1F2937", // Default text color
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
          const timestamp = Date.now();
          const pngObjectName = `svg-png/${channel.id}/${timestamp}.png`;
          const svgObjectName = `svg/${channel.id}/${timestamp}.svg`;

          await Promise.all([
            uploadFile("telegram-platform", pngObjectName, pngBuffer, "image/png"),
            uploadFile("telegram-platform", svgObjectName, Buffer.from(svgResult.svg, "utf-8"), "image/svg+xml"),
          ]);

          mediaUrls.push(`/api/media/telegram-platform/${pngObjectName}`);
        }
      } else {
        // Generate raster image
        const imagePrompt = await generateImagePromptFromContent(
          generatedPost.content,
          channelContext.language
        );

        if (imagePrompt) {
          const imageData = await generateImage(imagePrompt);
          if (imageData) {
            const buffer = Buffer.from(
              imageData.replace(/^data:image\/\w+;base64,/, ""),
              "base64"
            );
            const timestamp = Date.now();
            const objectName = `generated/${channel.id}/${timestamp}.jpg`;
            await uploadFile("telegram-platform", objectName, buffer, "image/jpeg");

            mediaUrls.push(`/api/media/telegram-platform/${objectName}`);
          }
        }
      }
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
