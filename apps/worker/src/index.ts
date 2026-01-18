import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { QUEUE_NAMES } from "@repo/shared/queues";
import { handlePublishJob } from "./jobs/publish.js";
import { handleScrapeJob } from "./jobs/scrape.js";
import { handleNotificationJob } from "./jobs/notify.js";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

console.log("Starting worker...");
console.log(`Connecting to Redis: ${REDIS_URL}`);

// Publishing worker
const publishingWorker = new Worker(
  QUEUE_NAMES.PUBLISHING,
  async (job) => {
    console.log(`Processing publishing job: ${job.id}`);
    return handlePublishJob(job.data);
  },
  {
    connection,
    concurrency: 5,
  }
);

publishingWorker.on("completed", (job) => {
  console.log(`Publishing job ${job.id} completed`);
});

publishingWorker.on("failed", (job, err) => {
  console.error(`Publishing job ${job?.id} failed:`, err.message);
});

// Scraping worker
const scrapingWorker = new Worker(
  QUEUE_NAMES.SCRAPING,
  async (job) => {
    console.log(`Processing scraping job: ${job.id}`);
    return handleScrapeJob(job.data);
  },
  {
    connection,
    concurrency: 2,
  }
);

scrapingWorker.on("completed", (job) => {
  console.log(`Scraping job ${job.id} completed`);
});

scrapingWorker.on("failed", (job, err) => {
  console.error(`Scraping job ${job?.id} failed:`, err.message);
});

// Notifications worker
const notificationsWorker = new Worker(
  QUEUE_NAMES.NOTIFICATIONS,
  async (job) => {
    console.log(`Processing notification job: ${job.id}`);
    return handleNotificationJob(job.data);
  },
  {
    connection,
    concurrency: 10,
  }
);

notificationsWorker.on("completed", (job) => {
  console.log(`Notification job ${job.id} completed`);
});

notificationsWorker.on("failed", (job, err) => {
  console.error(`Notification job ${job?.id} failed:`, err.message);
});

// Scheduled posts worker
const scheduledPostsWorker = new Worker(
  QUEUE_NAMES.SCHEDULED_POSTS,
  async (job) => {
    console.log(`Processing scheduled post job: ${job.id}`);
    return handlePublishJob(job.data);
  },
  {
    connection,
    concurrency: 5,
  }
);

scheduledPostsWorker.on("completed", (job) => {
  console.log(`Scheduled post job ${job.id} completed`);
});

scheduledPostsWorker.on("failed", (job, err) => {
  console.error(`Scheduled post job ${job?.id} failed:`, err.message);
});

console.log("Worker started successfully!");
console.log(`Listening on queues: ${Object.values(QUEUE_NAMES).join(", ")}`);

// Graceful shutdown
const shutdown = async () => {
  console.log("Shutting down workers...");
  await Promise.all([
    publishingWorker.close(),
    scrapingWorker.close(),
    notificationsWorker.close(),
    scheduledPostsWorker.close(),
  ]);
  await connection.quit();
  console.log("Workers shut down successfully");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
