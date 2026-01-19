import type { NextApiResponse } from "next";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { prisma } from "@repo/database";
import { withAdminAuth, type AuthenticatedRequest } from "~/lib/auth";
import { QUEUE_NAMES } from "@repo/shared/queues";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

// Singleton pattern for Redis connection
const globalForRedis = globalThis as unknown as { adminRedis?: Redis; adminQueues?: Record<string, Queue> };

if (!globalForRedis.adminRedis) {
  globalForRedis.adminRedis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });
}

if (!globalForRedis.adminQueues) {
  globalForRedis.adminQueues = {
    [QUEUE_NAMES.SCRAPING]: new Queue(QUEUE_NAMES.SCRAPING, { connection: globalForRedis.adminRedis }),
    [QUEUE_NAMES.PUBLISHING]: new Queue(QUEUE_NAMES.PUBLISHING, { connection: globalForRedis.adminRedis }),
    [QUEUE_NAMES.NOTIFICATIONS]: new Queue(QUEUE_NAMES.NOTIFICATIONS, { connection: globalForRedis.adminRedis }),
    [QUEUE_NAMES.SCHEDULED_POSTS]: new Queue(QUEUE_NAMES.SCHEDULED_POSTS, { connection: globalForRedis.adminRedis }),
  };
}

const queues = globalForRedis.adminQueues;

// Map job types to queue names
const jobTypeToQueue: Record<string, string> = {
  scraping: QUEUE_NAMES.SCRAPING,
  publishing: QUEUE_NAMES.PUBLISHING,
  notifications: QUEUE_NAMES.NOTIFICATIONS,
  "scheduled-posts": QUEUE_NAMES.SCHEDULED_POSTS,
};

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ success: false, error: "Invalid job ID" });
  }

  // Get job from database
  const jobLog = await prisma.jobLog.findUnique({ where: { id } });

  if (!jobLog) {
    return res.status(404).json({ success: false, error: "Job not found" });
  }

  if (req.method === "DELETE") {
    // Delete job from queue and database
    const queueName = jobTypeToQueue[jobLog.jobType];
    if (queueName && queues[queueName]) {
      try {
        const job = await queues[queueName].getJob(jobLog.jobId);
        if (job) {
          await job.remove();
        }
      } catch (e) {
        console.error("Failed to remove job from queue:", e);
      }
    }

    await prisma.jobLog.delete({ where: { id } });

    return res.status(200).json({ success: true, message: "Job deleted" });
  }

  if (req.method === "POST") {
    const { action } = req.body;

    if (action === "stop") {
      // Stop a running job
      if (jobLog.status !== "running" && jobLog.status !== "pending") {
        return res.status(400).json({ success: false, error: "Can only stop pending or running jobs" });
      }

      const queueName = jobTypeToQueue[jobLog.jobType];
      if (queueName && queues[queueName]) {
        try {
          const job = await queues[queueName].getJob(jobLog.jobId);
          if (job) {
            // Move to failed state
            await job.moveToFailed(new Error("Stopped by admin"), "admin-stop");
          }
        } catch (e) {
          console.error("Failed to stop job:", e);
        }
      }

      // Update database status
      await prisma.jobLog.update({
        where: { id },
        data: { status: "failed", error: "Stopped by admin", completedAt: new Date() },
      });

      return res.status(200).json({ success: true, message: "Job stopped" });
    }

    return res.status(400).json({ success: false, error: "Invalid action" });
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withAdminAuth(handler);
