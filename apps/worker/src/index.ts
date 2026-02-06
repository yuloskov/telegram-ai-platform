import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { QUEUE_NAMES } from "@repo/shared/queues";
import { prisma } from "@repo/database";
import { handlePublishJob } from "./jobs/publish.js";
import { handleScrapeJob } from "./jobs/scrape.js";
import { handleNotificationJob } from "./jobs/notify.js";
import { handleContentPlanJob } from "./jobs/content-plan.js";
import { handleParseDocumentJob } from "./jobs/parse-document.js";
import { handleParseWebpageJob } from "./jobs/parse-webpage.js";
import { handleCrawlWebsiteJob } from "./jobs/crawl-website.js";
import { handleParseWebsitePageJob } from "./jobs/parse-website-page.js";
import { getAutoScrapeScheduler } from "./services/auto-scrape-scheduler.js";
import { getPostScheduler } from "./services/post-scheduler.js";
import { getContentPlanScheduler } from "./services/content-plan-scheduler.js";
import { startDashboard } from "./dashboard.js";

// Helper to update job status in database
async function updateJobStatus(
  jobId: string,
  status: "running" | "completed" | "failed",
  extra?: { error?: string; result?: unknown }
) {
  try {
    const jobLog = await prisma.jobLog.findFirst({ where: { jobId } });
    if (!jobLog) return;

    if (status === "running") {
      await prisma.jobLog.update({
        where: { id: jobLog.id },
        data: { status, startedAt: new Date(), attempts: jobLog.attempts + 1 },
      });
    } else if (status === "completed") {
      await prisma.jobLog.update({
        where: { id: jobLog.id },
        data: { status, completedAt: new Date(), result: extra?.result ?? undefined },
      });
    } else if (status === "failed") {
      await prisma.jobLog.update({
        where: { id: jobLog.id },
        data: { status, completedAt: new Date(), error: extra?.error },
      });
    }
  } catch (e) {
    console.error(`Failed to update job status for ${jobId}:`, e);
  }
}

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
    if (job.id) await updateJobStatus(job.id, "running");
    return handleScrapeJob(job.data);
  },
  {
    connection,
    concurrency: 2,
  }
);

scrapingWorker.on("completed", async (job) => {
  console.log(`Scraping job ${job.id} completed`);
  if (job.id) await updateJobStatus(job.id, "completed");
});

scrapingWorker.on("failed", async (job, err) => {
  console.error(`Scraping job ${job?.id} failed:`, err.message);
  if (job?.id) await updateJobStatus(job.id, "failed", { error: err.message });
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

// Content plan worker
const contentPlanWorker = new Worker(
  QUEUE_NAMES.CONTENT_PLAN,
  async (job) => {
    console.log(`Processing content plan job: ${job.id}`);
    return handleContentPlanJob(job.data);
  },
  {
    connection,
    concurrency: 2,
  }
);

contentPlanWorker.on("completed", (job) => {
  console.log(`Content plan job ${job.id} completed`);
});

contentPlanWorker.on("failed", (job, err) => {
  console.error(`Content plan job ${job?.id} failed:`, err.message);
});

// Document parsing worker
const documentParsingWorker = new Worker(
  QUEUE_NAMES.DOCUMENT_PARSING,
  async (job) => {
    console.log(`Processing document parsing job: ${job.id}`);
    return handleParseDocumentJob(job.data);
  },
  {
    connection,
    concurrency: 1,
  }
);

documentParsingWorker.on("completed", (job) => {
  console.log(`Document parsing job ${job.id} completed`);
});

documentParsingWorker.on("failed", (job, err) => {
  console.error(`Document parsing job ${job?.id} failed:`, err.message);
});

// Webpage parsing worker
const webpageParsingWorker = new Worker(
  QUEUE_NAMES.WEBPAGE_PARSING,
  async (job) => {
    console.log(`Processing webpage parsing job: ${job.id}`);
    return handleParseWebpageJob(job.data);
  },
  {
    connection,
    concurrency: 2,
  }
);

webpageParsingWorker.on("completed", (job) => {
  console.log(`Webpage parsing job ${job.id} completed`);
});

webpageParsingWorker.on("failed", (job, err) => {
  console.error(`Webpage parsing job ${job?.id} failed:`, err.message);
});

// Website crawl worker (5 minute timeout for discovery + scoring)
const websiteCrawlWorker = new Worker(
  QUEUE_NAMES.WEBSITE_CRAWL,
  async (job) => {
    console.log(`Processing website crawl job: ${job.id}`);
    return handleCrawlWebsiteJob(job.data);
  },
  {
    connection,
    concurrency: 1,
    lockDuration: 5 * 60 * 1000,
  }
);

websiteCrawlWorker.on("completed", (job) => {
  console.log(`Website crawl job ${job.id} completed`);
});

websiteCrawlWorker.on("failed", (job, err) => {
  console.error(`Website crawl job ${job?.id} failed:`, err.message);
});

// Website page parse worker
const websitePageParseWorker = new Worker(
  QUEUE_NAMES.WEBSITE_PAGE_PARSE,
  async (job) => {
    console.log(`Processing website page parse job: ${job.id}`);
    return handleParseWebsitePageJob(job.data);
  },
  {
    connection,
    concurrency: 3,
  }
);

websitePageParseWorker.on("completed", (job) => {
  console.log(`Website page parse job ${job.id} completed`);
});

websitePageParseWorker.on("failed", async (job, err) => {
  console.error(`Website page parse job ${job?.id} failed:`, err.message);
  // Ensure finalization is attempted even when the job handler throws
  if (job?.data?.sourceId) {
    try {
      const { checkAndFinalizeCrawl } = await import("./jobs/crawl-website-finalize.js");
      await checkAndFinalizeCrawl(job.data.sourceId);
    } catch (e) {
      console.error("Finalize after page parse failure failed:", e);
    }
  }
});

console.log("Worker started successfully!");
console.log(`Listening on queues: ${Object.values(QUEUE_NAMES).join(", ")}`);

// Initialize auto-scrape scheduler
const autoScrapeScheduler = getAutoScrapeScheduler(REDIS_URL);
autoScrapeScheduler.initialize().catch((err) => {
  console.error("Failed to initialize auto-scrape scheduler:", err);
});

// Initialize post scheduler (polls for scheduled posts every minute)
const postScheduler = getPostScheduler(REDIS_URL);
postScheduler.start();

// Initialize content plan scheduler
const contentPlanScheduler = getContentPlanScheduler(REDIS_URL);
contentPlanScheduler.initialize().catch((err) => {
  console.error("Failed to initialize content plan scheduler:", err);
});

// Start Bull Board dashboard
const dashboard = startDashboard(connection);

// Graceful shutdown
const shutdown = async () => {
  console.log("Shutting down workers...");
  await Promise.all([
    publishingWorker.close(),
    scrapingWorker.close(),
    notificationsWorker.close(),
    scheduledPostsWorker.close(),
    contentPlanWorker.close(),
    documentParsingWorker.close(),
    webpageParsingWorker.close(),
    websiteCrawlWorker.close(),
    websitePageParseWorker.close(),
    autoScrapeScheduler.close(),
    postScheduler.close(),
    contentPlanScheduler.close(),
    dashboard.close(),
  ]);
  await connection.quit();
  console.log("Workers shut down successfully");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
