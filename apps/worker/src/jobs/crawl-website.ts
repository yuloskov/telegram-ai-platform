import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { prisma } from "@repo/database";
import { discoverPages, RELEVANCE_THRESHOLD } from "@repo/shared/website";
import {
  QUEUE_NAMES,
  WEBSITE_PAGE_PARSE_JOB_OPTIONS,
  type WebsiteCrawlJobPayload,
} from "@repo/shared/queues";
import { scorePageRelevance } from "../utils/score-relevance.js";

/**
 * Main website crawl orchestrator.
 * 1. Discover pages (sitemap + link crawling)
 * 2. Score relevance via AI
 * 3. Queue individual page parsing jobs
 */
export async function handleCrawlWebsiteJob(data: WebsiteCrawlJobPayload): Promise<void> {
  const { sourceId, websiteUrl, isIncremental } = data;

  const source = await prisma.contentSource.findUnique({
    where: { id: sourceId },
    include: { channel: true },
  });

  if (!source || source.sourceType !== "website") {
    throw new Error(`Website source not found: ${sourceId}`);
  }

  // Create ScrapeLog
  const scrapeLog = await prisma.scrapeLog.create({
    data: { sourceId, status: "running", startedAt: new Date() },
  });

  try {
    // Step 1: Discover pages
    await updateCrawlStatus(sourceId, "discovering");

    const existingPages = await prisma.websitePage.findMany({
      where: { sourceId },
      select: { url: true },
    });
    const existingUrls = new Set(existingPages.map((p) => p.url));

    const discovered = await discoverPages(websiteUrl, {
      maxPages: source.websiteMaxPages,
      filterPatterns: source.websiteFilterPatterns,
      existingUrls,
    });

    console.log(`Discovered ${discovered.length} pages (${discovered.filter((p) => p.isNew).length} new)`);

    // Insert new pages
    const newPages = discovered.filter((p) => p.isNew);
    for (const page of newPages) {
      await prisma.websitePage.create({
        data: {
          sourceId,
          url: page.url,
          path: new URL(page.url).pathname,
          title: page.title,
          status: "discovered",
        },
      });
    }

    const totalPages = await prisma.websitePage.count({ where: { sourceId } });
    await prisma.contentSource.update({
      where: { id: sourceId },
      data: { websitePagesTotal: totalPages },
    });

    // Step 2: Score relevance
    await updateCrawlStatus(sourceId, "scoring");

    const pagesToScore = await prisma.websitePage.findMany({
      where: { sourceId, status: "discovered" },
    });

    if (pagesToScore.length > 0) {
      const scored = await scorePageRelevance(
        pagesToScore.map((p) => ({ url: p.url, title: p.title ?? undefined })),
        {
          niche: source.channel.niche ?? undefined,
          language: source.channel.language,
        }
      );

      for (const result of scored) {
        const page = pagesToScore.find((p) => p.url === result.url);
        if (!page) continue;

        const isRelevant = result.score >= RELEVANCE_THRESHOLD;
        await prisma.websitePage.update({
          where: { id: page.id },
          data: {
            relevanceScore: result.score,
            status: isRelevant ? "relevant" : "skipped",
          },
        });
      }
    }

    // Step 3: Queue page parsing jobs
    await updateCrawlStatus(sourceId, "scraping");

    const pagesToScrape = await getPagesToParse(sourceId, isIncremental, source.websiteStalenessDays);
    console.log(`Queuing ${pagesToScrape.length} pages for parsing`);

    if (pagesToScrape.length > 0) {
      await queuePageParseJobs(sourceId, pagesToScrape);
    }

    // Update scrape log
    await prisma.scrapeLog.update({
      where: { id: scrapeLog.id },
      data: {
        status: pagesToScrape.length > 0 ? "running" : "completed",
        postsFound: totalPages,
        newPosts: newPages.length,
        completedAt: pagesToScrape.length === 0 ? new Date() : undefined,
      },
    });

    if (pagesToScrape.length === 0) {
      await updateCrawlStatus(sourceId, "completed");
      await prisma.contentSource.update({
        where: { id: sourceId },
        data: { lastScrapedAt: new Date(), websiteError: null },
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Crawl failed";
    console.error(`Website crawl failed for ${sourceId}:`, errorMessage);

    await prisma.contentSource.update({
      where: { id: sourceId },
      data: { websiteCrawlStatus: "failed", websiteError: errorMessage },
    });

    await prisma.scrapeLog.update({
      where: { id: scrapeLog.id },
      data: { status: "failed", error: errorMessage, completedAt: new Date() },
    });

    throw error;
  }
}

async function updateCrawlStatus(sourceId: string, status: string): Promise<void> {
  await prisma.contentSource.update({
    where: { id: sourceId },
    data: { websiteCrawlStatus: status },
  });
}

async function getPagesToParse(
  sourceId: string,
  isIncremental: boolean | undefined,
  stalenessDays: number
): Promise<Array<{ id: string; url: string; contentHash: string | null }>> {
  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - stalenessDays);

  if (isIncremental) {
    // Only scrape relevant pages that are new or stale
    return prisma.websitePage.findMany({
      where: {
        sourceId,
        status: "relevant",
        OR: [
          { lastScrapedAt: null },
          { lastScrapedAt: { lt: staleDate } },
        ],
      },
      select: { id: true, url: true, contentHash: true },
    });
  }

  // Full scrape: all relevant pages
  return prisma.websitePage.findMany({
    where: { sourceId, status: "relevant" },
    select: { id: true, url: true, contentHash: true },
  });
}

async function queuePageParseJobs(
  sourceId: string,
  pages: Array<{ id: string; url: string; contentHash: string | null }>
): Promise<void> {
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue(QUEUE_NAMES.WEBSITE_PAGE_PARSE, { connection });

  for (const page of pages) {
    await queue.add(
      `parse-page-${page.id}`,
      {
        sourceId,
        pageId: page.id,
        pageUrl: page.url,
        previousHash: page.contentHash ?? undefined,
      },
      WEBSITE_PAGE_PARSE_JOB_OPTIONS
    );
  }

  await queue.close();
  await connection.quit();
}
