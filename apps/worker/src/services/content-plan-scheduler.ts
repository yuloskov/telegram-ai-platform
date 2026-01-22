import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { prisma } from "@repo/database";
import { QUEUE_NAMES, DEFAULT_JOB_OPTIONS, type ContentPlanJobPayload } from "@repo/shared/queues";

export class ContentPlanScheduler {
  private queue: Queue<ContentPlanJobPayload>;
  private connection: Redis;

  constructor(redisUrl: string) {
    this.connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    this.queue = new Queue(QUEUE_NAMES.CONTENT_PLAN, {
      connection: this.connection,
    });
  }

  /**
   * Initialize scheduler by loading all enabled content plans
   */
  async initialize(): Promise<void> {
    console.log("Initializing content plan scheduler...");

    const plans = await prisma.contentPlan.findMany({
      where: { isEnabled: true },
    });

    console.log(`Found ${plans.length} enabled content plans`);

    for (const plan of plans) {
      await this.schedulePlan(plan.id, plan.cronSchedule, plan.timezone);
    }

    console.log("Content plan scheduler initialized");
  }

  /**
   * Schedule a repeatable job for a content plan
   */
  async schedulePlan(
    planId: string,
    cronSchedule: string,
    timezone: string
  ): Promise<string | undefined> {
    // Remove existing job if any
    await this.removePlanJob(planId);

    // Add repeatable job with cron pattern
    const job = await this.queue.add(
      `content-plan-${planId}`,
      { contentPlanId: planId },
      {
        ...DEFAULT_JOB_OPTIONS,
        repeat: {
          pattern: cronSchedule,
          tz: timezone,
        },
        jobId: `content-plan-${planId}`,
      }
    );

    console.log(`Scheduled content plan ${planId} with cron "${cronSchedule}" (${timezone})`);
    return job.repeatJobKey ?? job.id;
  }

  /**
   * Remove a content plan's repeatable job
   */
  async removePlanJob(planId: string): Promise<void> {
    const jobKey = `content-plan-${planId}`;

    try {
      // Get all repeatable jobs and find ALL matching this plan (may have duplicates)
      const repeatableJobs = await this.queue.getRepeatableJobs();
      const matchingJobs = repeatableJobs.filter((j) => j.name === jobKey);

      for (const job of matchingJobs) {
        await this.queue.removeRepeatableByKey(job.key);
        console.log(`Removed content plan job for ${planId} (key: ${job.key})`);
      }
    } catch (error) {
      console.error(`Failed to remove job for plan ${planId}:`, error);
    }
  }

  /**
   * Update a content plan's schedule
   */
  async updatePlanSchedule(
    planId: string,
    cronSchedule: string,
    timezone: string,
    isEnabled: boolean
  ): Promise<void> {
    if (!isEnabled) {
      await this.removePlanJob(planId);
      return;
    }

    await this.schedulePlan(planId, cronSchedule, timezone);
  }

  /**
   * Trigger a content plan to run immediately (for testing/manual trigger)
   */
  async triggerPlanNow(planId: string): Promise<void> {
    await this.queue.add(
      `content-plan-manual-${planId}`,
      { contentPlanId: planId },
      {
        ...DEFAULT_JOB_OPTIONS,
      }
    );
    console.log(`Triggered immediate execution of content plan ${planId}`);
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
let scheduler: ContentPlanScheduler | null = null;

export function getContentPlanScheduler(redisUrl: string): ContentPlanScheduler {
  if (!scheduler) {
    scheduler = new ContentPlanScheduler(redisUrl);
  }
  return scheduler;
}
