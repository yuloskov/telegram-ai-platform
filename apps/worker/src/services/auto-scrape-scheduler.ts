import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { prisma } from "@repo/database";
import { QUEUE_NAMES, SCRAPING_JOB_OPTIONS, type ScrapingJobPayload } from "@repo/shared/queues";

// Interval patterns for repeatable jobs
const INTERVAL_TO_PATTERN: Record<string, string> = {
  hourly: "0 * * * *",      // Every hour at minute 0
  daily: "0 9 * * *",       // Every day at 9 AM
  weekly: "0 9 * * 1",      // Every Monday at 9 AM
};

export class AutoScrapeScheduler {
  private queue: Queue<ScrapingJobPayload>;
  private connection: Redis;

  constructor(redisUrl: string) {
    this.connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    this.queue = new Queue(QUEUE_NAMES.SCRAPING, {
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
      await this.scheduleSource(source.id, source.scrapeInterval!);
    }

    console.log("Auto-scrape scheduler initialized");
  }

  /**
   * Schedule a repeatable job for a source
   */
  async scheduleSource(sourceId: string, interval: string): Promise<string | undefined> {
    const pattern = INTERVAL_TO_PATTERN[interval];
    if (!pattern) {
      console.error(`Invalid interval: ${interval}`);
      return undefined;
    }

    // Remove existing job if any
    await this.removeSourceJob(sourceId);

    // Add repeatable job
    const job = await this.queue.add(
      `auto-scrape-${sourceId}`,
      { sourceId },
      {
        ...SCRAPING_JOB_OPTIONS,
        repeat: {
          pattern,
        },
        jobId: `auto-scrape-${sourceId}`,
      }
    );

    // Update source with job ID
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
        await this.queue.removeRepeatableByKey(source.scrapeJobId);
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
    await this.queue.close();
    await this.connection.quit();
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
