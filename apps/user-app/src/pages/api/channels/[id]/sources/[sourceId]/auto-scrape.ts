import type { NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";

interface ScrapeConfig {
  maxScrapePosts: number;
  autoScrapeEnabled: boolean;
  scrapeInterval: string | null;
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<ScrapeConfig>>
) {
  const { user } = req;
  const { id: channelId, sourceId } = req.query;

  if (typeof channelId !== "string" || typeof sourceId !== "string") {
    return res.status(400).json({ success: false, error: "Invalid IDs" });
  }

  // Verify channel ownership
  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: user.id },
  });

  if (!channel) {
    return res.status(404).json({ success: false, error: "Channel not found" });
  }

  // Verify source belongs to channel
  const source = await prisma.contentSource.findFirst({
    where: { id: sourceId, channelId },
  });

  if (!source) {
    return res.status(404).json({ success: false, error: "Source not found" });
  }

  // GET - Get current config
  if (req.method === "GET") {
    return res.status(200).json({
      success: true,
      data: {
        maxScrapePosts: source.maxScrapePosts,
        autoScrapeEnabled: source.autoScrapeEnabled,
        scrapeInterval: source.scrapeInterval,
      },
    });
  }

  // PUT - Update config
  if (req.method === "PUT") {
    const { maxScrapePosts, autoScrapeEnabled, scrapeInterval } = req.body;

    // Validate maxScrapePosts (1-50)
    const parsedMaxPosts = parseInt(maxScrapePosts, 10);
    if (maxScrapePosts !== undefined && (isNaN(parsedMaxPosts) || parsedMaxPosts < 1 || parsedMaxPosts > 50)) {
      return res.status(400).json({
        success: false,
        error: "Max posts must be between 1 and 50.",
      });
    }

    // Validate interval
    const validIntervals = ["hourly", "daily", "weekly"];
    if (autoScrapeEnabled && scrapeInterval && !validIntervals.includes(scrapeInterval)) {
      return res.status(400).json({
        success: false,
        error: "Invalid scrape interval. Must be hourly, daily, or weekly.",
      });
    }

    const updatedSource = await prisma.contentSource.update({
      where: { id: sourceId },
      data: {
        ...(maxScrapePosts !== undefined && { maxScrapePosts: parsedMaxPosts }),
        autoScrapeEnabled: Boolean(autoScrapeEnabled),
        scrapeInterval: autoScrapeEnabled ? scrapeInterval : null,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        maxScrapePosts: updatedSource.maxScrapePosts,
        autoScrapeEnabled: updatedSource.autoScrapeEnabled,
        scrapeInterval: updatedSource.scrapeInterval,
      },
    });
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withAuth(handler);
