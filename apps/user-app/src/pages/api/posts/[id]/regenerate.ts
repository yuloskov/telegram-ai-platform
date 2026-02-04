import type { NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";
import {
  generateMultiplePostsWithImages,
  generateSVG,
  generateImagePromptFromContent,
  generateImage,
} from "@repo/ai";
import type { SVGStyleConfig } from "@repo/ai";
import { svgToPng, normalizeSvgDimensions } from "@repo/shared/svg";
import { uploadFile } from "@repo/shared/storage";

interface RegenerateResponse {
  post: {
    id: string;
    content: string;
    mediaFiles: { id: string; url: string; type: string; isGenerated: boolean }[];
  };
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<RegenerateResponse>>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { user } = req;
  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ success: false, error: "Invalid post ID" });
  }

  // Get the post and verify ownership
  const post = await prisma.post.findFirst({
    where: {
      id,
      channel: { userId: user.id },
    },
    include: {
      channel: true,
      contentPlan: {
        include: {
          contentSources: {
            include: { contentSource: true },
          },
        },
      },
      mediaFiles: true,
    },
  });

  if (!post) {
    return res.status(404).json({ success: false, error: "Post not found" });
  }

  // Can only regenerate posts with a content plan
  if (!post.contentPlan) {
    return res.status(400).json({
      success: false,
      error: "Post must have a content plan to regenerate",
    });
  }

  // Can only regenerate draft, scheduled, or pending_review posts
  if (!["draft", "scheduled", "pending_review"].includes(post.status)) {
    return res.status(400).json({
      success: false,
      error: "Can only regenerate draft, scheduled, or pending review posts",
    });
  }

  const plan = post.contentPlan;

  try {
    // Get previous posts for context (exclude current post)
    const previousPosts = await prisma.post.findMany({
      where: {
        contentPlanId: plan.id,
        id: { not: post.id },
      },
      orderBy: { createdAt: "desc" },
      take: plan.lookbackPostCount,
      select: { content: true },
    });

    // Get scraped content from sources
    const sourceIds = plan.contentSources.map((s) => s.contentSourceId);
    let scrapedContent: { id: string; text: string | null; views: number; mediaUrls: string[] }[] =
      [];

    if (sourceIds.length > 0) {
      scrapedContent = await prisma.scrapedContent.findMany({
        where: {
          sourceId: { in: sourceIds },
          usedForGeneration: false,
        },
        orderBy: { scrapedAt: "desc" },
        take: 20,
        select: {
          id: true,
          text: true,
          views: true,
          mediaUrls: true,
        },
      });
    }

    // Build channel context (use post.channel since plan doesn't include it)
    const channelContext = {
      niche: post.channel.niche ?? undefined,
      tone: plan.toneOverride ?? post.channel.tone,
      language: plan.languageOverride ?? post.channel.language,
      hashtags: post.channel.hashtags,
    };

    // Generate new content
    const result = await generateMultiplePostsWithImages(
      channelContext,
      scrapedContent.map((c) => ({
        id: c.id,
        text: c.text,
        views: c.views,
        hasImages: c.mediaUrls.filter((url) => !url.startsWith("skipped:")).length > 0,
        imageCount: c.mediaUrls.filter((url) => !url.startsWith("skipped:")).length,
      })),
      previousPosts.map((p) => p.content),
      plan.promptTemplate || undefined,
      1
    );

    if (result.posts.length === 0) {
      return res.status(500).json({
        success: false,
        error: "Failed to generate new content",
      });
    }

    const generatedPost = result.posts[0]!;

    // Generate new image if enabled
    let imageBuffer: Buffer | null = null;
    let mediaPath: string | undefined;

    if (plan.imageEnabled) {
      if (plan.imageType === "svg") {
        const svgStyle: SVGStyleConfig = {
          themeColor: plan.svgThemeColor,
          textColor: "#FFFFFF",
          backgroundStyle: plan.svgBackgroundStyle as SVGStyleConfig["backgroundStyle"],
          fontStyle: plan.svgFontStyle as SVGStyleConfig["fontStyle"],
          stylePrompt: plan.svgStylePrompt ?? undefined,
        };

        const svgResult = await generateSVG(generatedPost.content, svgStyle, channelContext.language);
        if (svgResult?.svg) {
          const normalizedSvg = normalizeSvgDimensions(svgResult.svg);
          imageBuffer = await svgToPng(normalizedSvg, { width: 1080 });
        }
      } else {
        const imagePrompt = await generateImagePromptFromContent(
          generatedPost.content,
          channelContext.language
        );
        if (imagePrompt) {
          const imageData = await generateImage(imagePrompt);
          if (imageData && imageData.startsWith("data:image")) {
            const base64Data = imageData.split(",")[1];
            if (base64Data) {
              imageBuffer = Buffer.from(base64Data, "base64");
            }
          }
        }
      }
    }

    if (imageBuffer) {
      const objectName = `generated/${post.id}/${Date.now()}.png`;
      mediaPath = `/api/media/telegram-platform/${objectName}`;
      await uploadFile("telegram-platform", objectName, imageBuffer, "image/png");

      // Delete old media files and create new one
      await prisma.mediaFile.deleteMany({ where: { postId: post.id } });
      await prisma.mediaFile.create({
        data: {
          postId: post.id,
          url: mediaPath,
          type: "photo",
          filename: `${Date.now()}.png`,
          mimeType: "image/png",
          size: imageBuffer.length,
          isGenerated: true,
        },
      });
    }

    // Update post content
    const updatedPost = await prisma.post.update({
      where: { id: post.id },
      data: { content: generatedPost.content },
      include: { mediaFiles: true },
    });

    // Mark scraped content as used
    if (generatedPost.sourceIds.length > 0) {
      await prisma.scrapedContent.updateMany({
        where: { id: { in: generatedPost.sourceIds } },
        data: { usedForGeneration: true },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        post: {
          id: updatedPost.id,
          content: updatedPost.content,
          mediaFiles: updatedPost.mediaFiles.map((m) => ({
            id: m.id,
            url: m.url,
            type: m.type,
            isGenerated: m.isGenerated,
          })),
        },
      },
    });
  } catch (error) {
    console.error("Post regeneration error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to regenerate post",
    });
  }
}

export default withAuth(handler);
