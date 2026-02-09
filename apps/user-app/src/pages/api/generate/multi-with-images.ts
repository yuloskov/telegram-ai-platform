import type { NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";
import { generateMultiplePostsWithImages, generateSVG, generateImagePromptFromContent, generateImage, extractImageContent, formatStoryArcContext } from "@repo/ai";
import type { SVGStyleConfig, ChannelContext } from "@repo/ai";
import { svgToPng } from "@repo/shared/svg";
import { uploadFile, storagePathToBase64 } from "@repo/shared/storage";
import {
  processGeneratedPost,
  transformToSourceContent,
  toMediaUrl,
  type GeneratedPost,
  type SourceContent,
} from "~/lib/generation-helpers";

interface MultiGenerateResponse {
  posts: GeneratedPost[];
  sources: SourceContent[];
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<MultiGenerateResponse>>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { user } = req;
  const {
    channelId,
    scrapedContentIds,
    channelContextPostIds,
    customPrompt,
    count = 3,
    autoRegenerate = false,
    regenerateAllImages = false,
    imageType = "raster",
    svgSettings,
  } = req.body;

  if (!channelId) {
    return res.status(400).json({ success: false, error: "Channel ID is required" });
  }

  const hasSourceIds = scrapedContentIds && Array.isArray(scrapedContentIds) && scrapedContentIds.length > 0;
  const hasCustomPrompt = customPrompt && typeof customPrompt === "string" && customPrompt.trim().length > 0;

  // Require either sources or a custom prompt
  if (!hasSourceIds && !hasCustomPrompt) {
    return res.status(400).json({
      success: false,
      error: "Either source content or a custom prompt is required",
    });
  }

  const postCount = Math.min(5, Math.max(1, Number(count) || 3));

  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: user.id },
  });

  if (!channel) {
    return res.status(404).json({ success: false, error: "Channel not found" });
  }

  // Fetch scraped content only if source IDs were provided
  const scrapedContent = hasSourceIds
    ? await prisma.scrapedContent.findMany({
        where: {
          id: { in: scrapedContentIds },
          source: { channelId },
        },
        select: {
          id: true,
          text: true,
          views: true,
          telegramMessageId: true,
          source: { select: { telegramUsername: true } },
          mediaUrls: true,
        },
      })
    : [];

  // Only error if sources were requested but not found
  if (hasSourceIds && scrapedContent.length === 0) {
    return res.status(404).json({ success: false, error: "No scraped content found" });
  }

  // Fetch channel context posts - either selected ones or recent published
  const recentPosts = await prisma.post.findMany({
    where: channelContextPostIds?.length > 0
      ? { id: { in: channelContextPostIds }, channelId, status: "published" }
      : { channelId, status: "published" },
    orderBy: { publishedAt: "desc" },
    take: channelContextPostIds?.length > 0 ? undefined : 10,
    select: { content: true },
  });

  try {
    // Build channel context with persona fields if in personal blog mode
    const channelContext: ChannelContext = {
      niche: channel.niche ?? undefined,
      tone: channel.tone,
      language: channel.language,
      hashtags: channel.hashtags,
      channelMode: channel.channelMode,
      personaName: channel.personaName ?? undefined,
      personaDescription: channel.personaDescription ?? undefined,
    };

    // For personal blog mode, fetch persona assets and active story arcs
    let effectivePrompt = customPrompt;
    if (channel.channelMode === "personal_blog") {
      const [personaAssets, activeArcs] = await Promise.all([
        prisma.personaAsset.findMany({
          where: { channelId },
          orderBy: { sortOrder: "asc" },
          select: { label: true, description: true },
        }),
        prisma.storyArc.findMany({
          where: {
            channelId,
            isUsed: false,
            activeDate: { lte: new Date() },
            OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
          },
          orderBy: { activeDate: "asc" },
          select: { title: true, description: true },
        }),
      ]);

      channelContext.personaAssets = personaAssets.map((a) => ({
        label: a.label,
        description: a.description ?? undefined,
      }));

      if (activeArcs.length > 0) {
        const arcContext = formatStoryArcContext(activeArcs, channel.language);
        effectivePrompt = (effectivePrompt || "") + "\n" + arcContext;
      }
    }

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
      recentPosts.map((p) => p.content),
      effectivePrompt,
      postCount
    );

    const sourceMap = new Map(scrapedContent.map((c) => [c.id, c]));

    const postsWithImages: GeneratedPost[] = [];

    // Handle SVG vs raster image generation
    if (imageType === "svg") {
      // Generate SVG images using settings from request (localStorage) with defaults
      const svgStyleConfig: SVGStyleConfig = {
        stylePrompt: svgSettings?.stylePrompt || undefined,
        themeColor: svgSettings?.themeColor || "#3B82F6",
        textColor: svgSettings?.textColor || "#1F2937",
        backgroundStyle: (svgSettings?.backgroundStyle as "solid" | "gradient" | "transparent") || "gradient",
        fontStyle: (svgSettings?.fontStyle as "modern" | "classic" | "playful" | "technical") || "modern",
      };

      for (const post of result.posts) {
        // Always collect original images from source posts
        const sourceIdsToUse =
          post.imageDecision.strategy === "use_original" &&
          post.imageDecision.originalImageSourceIds
            ? post.imageDecision.originalImageSourceIds
            : post.sourceIds;

        // Collect images with both URL and storage path for processing
        const imagesWithPaths: Array<{ url: string; storagePath: string; sourceId: string }> = [];
        for (const sourceId of sourceIdsToUse) {
          const source = sourceMap.get(sourceId);
          if (source) {
            const validPaths = source.mediaUrls.filter(
              (path) => !path.startsWith("skipped:")
            );
            for (const storagePath of validPaths) {
              imagesWithPaths.push({
                url: toMediaUrl(storagePath),
                storagePath,
                sourceId,
              });
            }
          }
        }

        // Build originalImages for the response
        const originalImages: GeneratedPost["images"] = imagesWithPaths.map((img) => ({
          url: img.url,
          isGenerated: false,
          sourceId: img.sourceId,
        }));

        const generatedImages: GeneratedPost["images"] = [];

        if (regenerateAllImages) {
          // For each original image: extract text content, then generate SVG
          let svgIndex = 0;
          for (const img of imagesWithPaths) {
            // Convert storage path to base64 for AI analysis
            const base64DataUrl = await storagePathToBase64(img.storagePath);
            const imageContent = await extractImageContent(base64DataUrl, channel.language);

            // Use extracted text for SVG - skip if extraction failed
            const validDescription = imageContent.description !== "Image content" ? imageContent.description : null;
            const contentForSVG = imageContent.textContent || validDescription;

            // Skip this image if no content was extracted
            if (!contentForSVG) {
              continue;
            }

            const svgResult = await generateSVG(contentForSVG, svgStyleConfig, channel.language);
            if (svgResult) {
              const pngBuffer = await svgToPng(svgResult.svg, { width: 1080, height: 1080 });
              const timestamp = Date.now() + svgIndex; // Ensure unique timestamps
              svgIndex++;
              const pngObjectName = `svg-png/${channelId}/${timestamp}.png`;
              const svgObjectName = `svg/${channelId}/${timestamp}.svg`;

              await Promise.all([
                uploadFile("telegram-platform", pngObjectName, pngBuffer, "image/png"),
                uploadFile("telegram-platform", svgObjectName, Buffer.from(svgResult.svg, "utf-8"), "image/svg+xml"),
              ]);

              const pngStoragePath = `telegram-platform/${pngObjectName}`;
              generatedImages.push({
                url: toMediaUrl(pngStoragePath),
                isGenerated: true,
                prompt: svgResult.prompt,
                sourceStoragePath: img.storagePath,
              });
            }
          }

          // If no original images, generate one SVG based on post content
          if (originalImages.length === 0) {
            const svgResult = await generateSVG(post.content, svgStyleConfig, channel.language);
            if (svgResult) {
              const pngBuffer = await svgToPng(svgResult.svg, { width: 1080, height: 1080 });
              const timestamp = Date.now();
              const pngObjectName = `svg-png/${channelId}/${timestamp}.png`;
              const svgObjectName = `svg/${channelId}/${timestamp}.svg`;

              await Promise.all([
                uploadFile("telegram-platform", pngObjectName, pngBuffer, "image/png"),
                uploadFile("telegram-platform", svgObjectName, Buffer.from(svgResult.svg, "utf-8"), "image/svg+xml"),
              ]);

              const pngStoragePath = `telegram-platform/${pngObjectName}`;
              generatedImages.push({
                url: toMediaUrl(pngStoragePath),
                isGenerated: true,
                prompt: svgResult.prompt,
              });
            }
          }
        } else {
          // Generate single SVG image
          const svgResult = await generateSVG(post.content, svgStyleConfig, channel.language);
          if (svgResult) {
            const pngBuffer = await svgToPng(svgResult.svg, { width: 1080, height: 1080 });
            const timestamp = Date.now();
            const pngObjectName = `svg-png/${channelId}/${timestamp}.png`;
            const svgObjectName = `svg/${channelId}/${timestamp}.svg`;

            await Promise.all([
              uploadFile("telegram-platform", pngObjectName, pngBuffer, "image/png"),
              uploadFile("telegram-platform", svgObjectName, Buffer.from(svgResult.svg, "utf-8"), "image/svg+xml"),
            ]);

            const pngStoragePath = `telegram-platform/${pngObjectName}`;
            generatedImages.push({
              url: toMediaUrl(pngStoragePath),
              isGenerated: true,
              prompt: svgResult.prompt,
            });
          }
        }

        postsWithImages.push({
          content: post.content,
          angle: post.angle,
          sourceIds: post.sourceIds,
          imageDecision: post.imageDecision,
          images: [...originalImages, ...generatedImages],
        });
      }
    } else {
      // Standard raster image processing
      for (const post of result.posts) {
        if (regenerateAllImages) {
          // Always collect original images from source posts
          const sourceIdsToUse =
            post.imageDecision.strategy === "use_original" &&
            post.imageDecision.originalImageSourceIds
              ? post.imageDecision.originalImageSourceIds
              : post.sourceIds;

          // Collect images with both URL and storage path for processing
          const imagesWithPaths: Array<{ url: string; storagePath: string; sourceId: string }> = [];
          for (const sourceId of sourceIdsToUse) {
            const source = sourceMap.get(sourceId);
            if (source) {
              const validPaths = source.mediaUrls.filter(
                (path) => !path.startsWith("skipped:")
              );
              for (const storagePath of validPaths) {
                imagesWithPaths.push({
                  url: toMediaUrl(storagePath),
                  storagePath,
                  sourceId,
                });
              }
            }
          }

          // Build originalImages for the response
          const originalImages: GeneratedPost["images"] = imagesWithPaths.map((img) => ({
            url: img.url,
            isGenerated: false,
            sourceId: img.sourceId,
          }));

          // For each original image: extract content, generate prompt, then generate raster image
          const generatedImages: GeneratedPost["images"] = [];
          let rasterIndex = 0;

          for (const img of imagesWithPaths) {
            // Convert storage path to base64 for AI analysis
            const base64DataUrl = await storagePathToBase64(img.storagePath);
            const imageContent = await extractImageContent(base64DataUrl, channel.language);

            // Generate prompt from extracted content - skip if extraction failed
            const validDescription = imageContent.description !== "Image content" ? imageContent.description : null;
            const contentForPrompt = imageContent.textContent || validDescription;

            // Skip this image if no content was extracted
            if (!contentForPrompt) {
              continue;
            }

            const imagePrompt = await generateImagePromptFromContent(contentForPrompt, channel.language);

            if (imagePrompt) {
              const imageData = await generateImage(imagePrompt);
              if (imageData) {
                const buffer = Buffer.from(
                  imageData.replace(/^data:image\/\w+;base64,/, ""),
                  "base64"
                );
                const timestamp = Date.now() + rasterIndex; // Ensure unique timestamps
                rasterIndex++;
                const objectName = `generated/${channelId}/${timestamp}.jpg`;
                await uploadFile("telegram-platform", objectName, buffer, "image/jpeg");

                const storagePath = `telegram-platform/${objectName}`;
                generatedImages.push({
                  url: toMediaUrl(storagePath),
                  isGenerated: true,
                  prompt: imagePrompt,
                  sourceStoragePath: img.storagePath,
                });
              }
            }
          }

          // If no original images, generate one based on post content
          if (imagesWithPaths.length === 0) {
            const imagePrompt = await generateImagePromptFromContent(post.content, channel.language);
            if (imagePrompt) {
              const imageData = await generateImage(imagePrompt);
              if (imageData) {
                const buffer = Buffer.from(
                  imageData.replace(/^data:image\/\w+;base64,/, ""),
                  "base64"
                );
                const timestamp = Date.now();
                const objectName = `generated/${channelId}/${timestamp}.jpg`;
                await uploadFile("telegram-platform", objectName, buffer, "image/jpeg");

                const storagePath = `telegram-platform/${objectName}`;
                generatedImages.push({
                  url: toMediaUrl(storagePath),
                  isGenerated: true,
                  prompt: imagePrompt,
                });
              }
            }
          }

          postsWithImages.push({
            content: post.content,
            angle: post.angle,
            sourceIds: post.sourceIds,
            imageDecision: post.imageDecision,
            images: [...originalImages, ...generatedImages],
          });
        } else {
          const processedPost = await processGeneratedPost(
            post,
            sourceMap,
            channelId,
            channel.language,
            autoRegenerate
          );
          postsWithImages.push(processedPost);
        }
      }
    }

    // Mark scraped content as used (only if we had sources)
    if (scrapedContent.length > 0) {
      await prisma.scrapedContent.updateMany({
        where: { id: { in: scrapedContent.map((c) => c.id) } },
        data: { usedForGeneration: true },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        posts: postsWithImages,
        sources: scrapedContent.map(transformToSourceContent),
      },
    });
  } catch (error) {
    console.error("Multi-generation with images error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate content",
    });
  }
}

export default withAuth(handler);
