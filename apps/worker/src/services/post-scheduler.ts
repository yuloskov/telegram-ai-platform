import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { prisma } from "@repo/database";
import {
  QUEUE_NAMES,
  PUBLISHING_JOB_OPTIONS,
  DEFAULT_JOB_OPTIONS,
  type PublishingJobPayload,
  type NotificationJobPayload,
} from "@repo/shared/queues";

const POLL_INTERVAL_MS = 60 * 1000; // Poll every minute

export class PostScheduler {
  private queue: Queue<PublishingJobPayload>;
  private notifyQueue: Queue<NotificationJobPayload>;
  private connection: Redis;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(redisUrl: string) {
    this.connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    this.queue = new Queue(QUEUE_NAMES.SCHEDULED_POSTS, {
      connection: this.connection,
    });
    this.notifyQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, {
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

    // Find all scheduled posts that are due (exclude already skipped posts)
    const duePosts = await prisma.post.findMany({
      where: {
        status: "scheduled",
        scheduledAt: {
          lte: now,
        },
        skippedAt: null, // Don't process posts that have already been skipped
      },
      include: {
        channel: {
          include: {
            user: true,
          },
        },
        contentPlan: true,
      },
    });

    if (duePosts.length === 0) {
      return;
    }

    console.log(`Found ${duePosts.length} scheduled posts due for publishing`);

    for (const post of duePosts) {
      try {
        // Check if content plan exists and is paused
        if (post.contentPlan && !post.contentPlan.isEnabled) {
          await this.handleSkippedPost(post, now);
          continue;
        }

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
   * Mark a post as skipped and notify the user
   */
  private async handleSkippedPost(
    post: {
      id: string;
      channel: {
        title: string;
        user: { id: string; telegramId: bigint };
      };
    },
    skippedAt: Date
  ): Promise<void> {
    // Mark post as skipped
    await prisma.post.update({
      where: { id: post.id },
      data: { skippedAt },
    });

    // Send notification about skipped post
    await this.notifyQueue.add(
      "post-skipped",
      {
        userId: post.channel.user.id,
        telegramId: post.channel.user.telegramId.toString(),
        type: "post_skipped",
        title: "Post Skipped",
        message: `Post for "${post.channel.title}" was skipped because the content plan is paused.`,
      },
      DEFAULT_JOB_OPTIONS
    );

    console.log(`Post ${post.id} skipped - content plan is paused`);
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
    await this.notifyQueue.close();
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
