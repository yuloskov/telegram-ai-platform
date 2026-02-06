import { prisma } from "@repo/database";

/**
 * Check if all pages for a website source have been processed.
 * Called after each page parse completes.
 */
export async function checkAndFinalizeCrawl(sourceId: string): Promise<void> {
  const source = await prisma.contentSource.findUnique({
    where: { id: sourceId },
  });

  if (!source || source.sourceType !== "website") return;
  if (source.websiteCrawlStatus !== "scraping") return;

  // Count pages still being scraped
  const pendingCount = await prisma.websitePage.count({
    where: {
      sourceId,
      status: { in: ["relevant", "scraping"] },
    },
  });

  if (pendingCount > 0) return;

  // All pages processed — finalize
  const scrapedCount = await prisma.websitePage.count({
    where: { sourceId, status: "scraped" },
  });

  await prisma.contentSource.update({
    where: { id: sourceId },
    data: {
      websiteCrawlStatus: "completed",
      websitePagesScraped: scrapedCount,
      websiteError: null,
      lastScrapedAt: new Date(),
    },
  });

  // Complete the latest running scrape log
  const latestLog = await prisma.scrapeLog.findFirst({
    where: { sourceId, status: "running" },
    orderBy: { createdAt: "desc" },
  });

  if (latestLog) {
    await prisma.scrapeLog.update({
      where: { id: latestLog.id },
      data: { status: "completed", completedAt: new Date() },
    });
  }

  console.log(`Website crawl finalized for source ${sourceId}: ${scrapedCount} pages scraped`);
}
