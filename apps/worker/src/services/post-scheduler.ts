import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { prisma } from "@repo/database";
import { QUEUE_NAMES, PUBLISHING_JOB_OPTIONS, type PublishingJobPayload } from "@repo/shared/queues";

const POLL_INTERVAL_MS = 60 * 1000; // Poll every minute

export class PostScheduler {
  private queue: Queue<PublishingJobPayload>;
  private connection: Redis;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(redisUrl: string) {
    this.connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    this.queue = new Queue(QUEUE_NAMES.SCHEDULED_POSTS, {
      connection: this.connection,
    });
  }

  /**
   * Start the scheduler - polls every minute for due posts
   */
  start(): void {
    console.log("Starting post scheduler...");

    // Run immediately on start
    this.pollForDuePosts().catch((err) => {
      console.error("Error in initial poll:", err);
    });

    // Then poll every minute
    this.intervalId = setInterval(() => {
      this.pollForDuePosts().catch((err) => {
        console.error("Error polling for due posts:", err);
      });
    }, POLL_INTERVAL_MS);

    console.log("Post scheduler started - polling every minute");
  }

  /**
   * Query for posts that are due and create publishing jobs
   */
  private async pollForDuePosts(): Promise<void> {
    const now = new Date();

    // Find all scheduled posts that are due
    const duePosts = await prisma.post.findMany({
      where: {
        status: "scheduled",
        scheduledAt: {
          lte: now,
        },
      },
      include: {
        channel: true,
      },
    });

    if (duePosts.length === 0) {
      return;
    }

    console.log(`Found ${duePosts.length} scheduled posts due for publishing`);

    for (const post of duePosts) {
      try {
        // Update status to publishing
        await prisma.post.update({
          where: { id: post.id },
          data: { status: "publishing" },
        });

        // Add to publishing queue
        await this.queue.add(
          "scheduled-publish",
          {
            postId: post.id,
            channelTelegramId: post.channel.telegramId.toString(),
          },
          PUBLISHING_JOB_OPTIONS
        );

        console.log(`Queued scheduled post ${post.id} for publishing`);
      } catch (error) {
        console.error(`Failed to queue post ${post.id}:`, error);
      }
    }
  }

  /**
   * Stop the scheduler
   */
  async close(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    await this.queue.close();
    await this.connection.quit();
    console.log("Post scheduler stopped");
  }
}

// Singleton instance
let scheduler: PostScheduler | null = null;

export function getPostScheduler(redisUrl: string): PostScheduler {
  if (!scheduler) {
    scheduler = new PostScheduler(redisUrl);
  }
  return scheduler;
}
