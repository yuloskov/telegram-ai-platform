import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { prisma } from "@repo/database";
import {
  QUEUE_NAMES,
  SCRAPING_JOB_OPTIONS,
  WEBSITE_CRAWL_JOB_OPTIONS,
  type ScrapingJobPayload,
  type WebsiteCrawlJobPayload,
} from "@repo/shared/queues";

// Interval patterns for repeatable jobs
const INTERVAL_TO_PATTERN: Record<string, string> = {
  hourly: "0 * * * *",      // Every hour at minute 0
  daily: "0 9 * * *",       // Every day at 9 AM
  weekly: "0 9 * * 1",      // Every Monday at 9 AM
};

export class AutoScrapeScheduler {
  private scrapingQueue: Queue<ScrapingJobPayload>;
  private websiteCrawlQueue: Queue<WebsiteCrawlJobPayload>;
  private connection: Redis;

  constructor(redisUrl: string) {
    this.connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    this.scrapingQueue = new Queue(QUEUE_NAMES.SCRAPING, {
      connection: this.connection,
    });
    this.websiteCrawlQueue = new Queue(QUEUE_NAMES.WEBSITE_CRAWL, {
      connection: this.connection,
    });
  }

  /**
   * Initialize scheduler by loading all auto-scrape enabled sources
   */
  async initialize(): Promise<void> {
    console.log("Initializing auto-scrape scheduler...");

    const sources = await prisma.contentSource.findMany({
      where: {
        autoScrapeEnabled: true,
        scrapeInterval: { not: null },
      },
    });

    console.log(`Found ${sources.length} sources with auto-scrape enabled`);

    for (const source of sources) {
      await this.scheduleSource(source.id, source.scrapeInterval!, source.sourceType);
    }

    console.log("Auto-scrape scheduler initialized");
  }

  /**
   * Schedule a repeatable job for a source
   */
  async scheduleSource(
    sourceId: string,
    interval: string,
    sourceType?: string
  ): Promise<string | undefined> {
    const pattern = INTERVAL_TO_PATTERN[interval];
    if (!pattern) {
      console.error(`Invalid interval: ${interval}`);
      return undefined;
    }

    // Remove existing job if any
    await this.removeSourceJob(sourceId);

    // Determine queue based on source type
    const type = sourceType ?? (await this.getSourceType(sourceId));

    if (type === "website") {
      const source = await prisma.contentSource.findUnique({ where: { id: sourceId } });
      if (!source?.websiteUrl) return undefined;

      const job = await this.websiteCrawlQueue.add(
        `auto-crawl-${sourceId}`,
        { sourceId, websiteUrl: source.websiteUrl, isIncremental: true },
        {
          ...WEBSITE_CRAWL_JOB_OPTIONS,
          repeat: { pattern },
          jobId: `auto-crawl-${sourceId}`,
        }
      );

      await prisma.contentSource.update({
        where: { id: sourceId },
        data: { scrapeJobId: job.repeatJobKey ?? job.id },
      });

      console.log(`Scheduled auto-crawl for website source ${sourceId} with pattern ${pattern}`);
      return job.repeatJobKey ?? job.id;
    }

    // Default: telegram scraping
    const job = await this.scrapingQueue.add(
      `auto-scrape-${sourceId}`,
      { sourceId },
      {
        ...SCRAPING_JOB_OPTIONS,
        repeat: { pattern },
        jobId: `auto-scrape-${sourceId}`,
      }
    );

    await prisma.contentSource.update({
      where: { id: sourceId },
      data: { scrapeJobId: job.repeatJobKey ?? job.id },
    });

    console.log(`Scheduled auto-scrape for source ${sourceId} with pattern ${pattern}`);
    return job.repeatJobKey ?? job.id;
  }

  /**
   * Remove a source's repeatable job
   */
  async removeSourceJob(sourceId: string): Promise<void> {
    const source = await prisma.contentSource.findUnique({
      where: { id: sourceId },
    });

    if (source?.scrapeJobId) {
      try {
        // Try both queues since we don't know which one the job is on
        await this.scrapingQueue.removeRepeatableByKey(source.scrapeJobId).catch(() => {});
        await this.websiteCrawlQueue.removeRepeatableByKey(source.scrapeJobId).catch(() => {});
        console.log(`Removed auto-scrape job for source ${sourceId}`);
      } catch (error) {
        console.error(`Failed to remove job ${source.scrapeJobId}:`, error);
      }
    }
  }

  /**
   * Update a source's schedule
   */
  async updateSourceSchedule(sourceId: string, interval: string | null, enabled: boolean): Promise<void> {
    if (!enabled || !interval) {
      await this.removeSourceJob(sourceId);
      await prisma.contentSource.update({
        where: { id: sourceId },
        data: {
          autoScrapeEnabled: false,
          scrapeInterval: null,
          scrapeJobId: null,
        },
      });
      return;
    }

    await prisma.contentSource.update({
      where: { id: sourceId },
      data: {
        autoScrapeEnabled: true,
        scrapeInterval: interval,
      },
    });

    await this.scheduleSource(sourceId, interval);
  }

  /**
   * Close the scheduler
   */
  async close(): Promise<void> {
    await this.scrapingQueue.close();
    await this.websiteCrawlQueue.close();
    await this.connection.quit();
  }

  private async getSourceType(sourceId: string): Promise<string> {
    const source = await prisma.contentSource.findUnique({
      where: { id: sourceId },
      select: { sourceType: true },
    });
    return source?.sourceType ?? "telegram";
  }
}

// Singleton instance
let scheduler: AutoScrapeScheduler | null = null;

export function getAutoScrapeScheduler(redisUrl: string): AutoScrapeScheduler {
  if (!scheduler) {
    scheduler = new AutoScrapeScheduler(redisUrl);
  }
  return scheduler;
}
