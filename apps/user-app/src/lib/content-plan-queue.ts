// Utility for managing content plan jobs from the API side

import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { QUEUE_NAMES, DEFAULT_JOB_OPTIONS, type ContentPlanJobPayload } from "@repo/shared/queues";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

let queue: Queue<ContentPlanJobPayload> | null = null;
let connection: Redis | null = null;

function getQueue(): Queue<ContentPlanJobPayload> {
  if (!queue) {
    connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
    queue = new Queue(QUEUE_NAMES.CONTENT_PLAN, { connection });
  }
  return queue;
}

/**
 * Schedule a content plan job with cron pattern
 */
export async function scheduleContentPlan(
  planId: string,
  cronSchedule: string,
  timezone: string
): Promise<void> {
  const q = getQueue();
  const jobKey = `content-plan-${planId}`;

  // Remove existing repeatable job if any
  await removeContentPlanJob(planId);

  // Add new repeatable job
  await q.add(
    jobKey,
    { contentPlanId: planId },
    {
      ...DEFAULT_JOB_OPTIONS,
      repeat: {
        pattern: cronSchedule,
        tz: timezone,
      },
      jobId: jobKey,
    }
  );

  console.log(`Scheduled content plan ${planId} with cron "${cronSchedule}" (${timezone})`);
}

/**
 * Remove a content plan's scheduled job
 */
export async function removeContentPlanJob(planId: string): Promise<void> {
  const q = getQueue();
  const jobKey = `content-plan-${planId}`;

  try {
    const repeatableJobs = await q.getRepeatableJobs();
    // Find ALL jobs matching this plan (there might be duplicates with different cron patterns)
    const matchingJobs = repeatableJobs.filter((j) => j.name === jobKey);

    for (const job of matchingJobs) {
      await q.removeRepeatableByKey(job.key);
      console.log(`Removed content plan job for ${planId} (key: ${job.key})`);
    }
  } catch (error) {
    console.error(`Failed to remove job for plan ${planId}:`, error);
  }
}

/**
 * Update content plan schedule (remove old, add new if enabled)
 */
export async function updateContentPlanSchedule(
  planId: string,
  cronSchedule: string,
  timezone: string,
  isEnabled: boolean
): Promise<void> {
  if (!isEnabled) {
    await removeContentPlanJob(planId);
    return;
  }

  await scheduleContentPlan(planId, cronSchedule, timezone);
}

/**
 * Trigger a content plan to run immediately
 */
export async function triggerContentPlanNow(planId: string): Promise<void> {
  const q = getQueue();

  await q.add(
    `content-plan-manual-${planId}-${Date.now()}`,
    { contentPlanId: planId },
    DEFAULT_JOB_OPTIONS
  );

  console.log(`Triggered immediate execution of content plan ${planId}`);
}

/**
 * Get next run times for content plans
 * Returns a map of planId -> next run timestamp (ms)
 */
export async function getContentPlanNextRunTimes(): Promise<Map<string, number>> {
  const q = getQueue();
  const result = new Map<string, number>();

  try {
    const repeatableJobs = await q.getRepeatableJobs();

    for (const job of repeatableJobs) {
      // Extract planId from job name (format: content-plan-{planId})
      const match = job.name?.match(/^content-plan-(.+)$/);
      const planId = match?.[1];
      if (planId && job.next) {
        result.set(planId, job.next);
      }
    }
  } catch (error) {
    console.error("Failed to get content plan next run times:", error);
  }

  return result;
}
