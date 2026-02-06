export const QUEUE_NAMES = {
  SCRAPING: "scraping",
  PUBLISHING: "publishing",
  NOTIFICATIONS: "notifications",
  SCHEDULED_POSTS: "scheduled-posts",
  AUTO_GENERATION: "auto-generation",
  CONTENT_PLAN: "content-plan",
  DOCUMENT_PARSING: "document-parsing",
  WEBPAGE_PARSING: "webpage-parsing",
  WEBSITE_CRAWL: "website-crawl",
  WEBSITE_PAGE_PARSE: "website-page-parse",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// Job payload types
export interface ScrapingJobPayload {
  sourceId: string;
  sessionId?: string;
}

export interface PublishingJobPayload {
  postId: string;
  channelTelegramId: string;
  retryCount?: number;
}

export interface NotificationJobPayload {
  userId: string;
  telegramId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface ScheduledPostJobPayload {
  postId: string;
}

export interface AutoGenerationJobPayload {
  channelId: string;
  configId: string;
  sourceMode: "research" | "scraped";
  topic?: string;
  scrapedContentIds?: string[];
}

export interface ContentPlanJobPayload {
  contentPlanId: string;
}

export interface DocumentParsingJobPayload {
  sourceId: string;
  documentUrl: string;
}

export interface WebpageParsingJobPayload {
  sourceId: string;
  webpageUrl: string;
}

export interface WebsiteCrawlJobPayload {
  sourceId: string;
  websiteUrl: string;
  isIncremental?: boolean;
}

export interface WebsitePageParseJobPayload {
  sourceId: string;
  pageId: string;
  pageUrl: string;
  previousHash?: string;
}

// Job options
export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 5000,
  },
  removeOnComplete: {
    count: 100,
    age: 24 * 60 * 60, // 24 hours
  },
  removeOnFail: {
    count: 200,
    age: 7 * 24 * 60 * 60, // 7 days
  },
};

export const SCRAPING_JOB_OPTIONS = {
  ...DEFAULT_JOB_OPTIONS,
  attempts: 2,
  backoff: {
    type: "exponential" as const,
    delay: 60000, // 1 minute between retries for scraping
  },
};

export const PUBLISHING_JOB_OPTIONS = {
  ...DEFAULT_JOB_OPTIONS,
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 5000,
  },
};

export const DOCUMENT_PARSING_JOB_OPTIONS = {
  ...DEFAULT_JOB_OPTIONS,
  attempts: 2,
  backoff: {
    type: "exponential" as const,
    delay: 30000, // 30 seconds between retries
  },
};

export const WEBPAGE_PARSING_JOB_OPTIONS = {
  ...DEFAULT_JOB_OPTIONS,
  attempts: 2,
  backoff: {
    type: "exponential" as const,
    delay: 30000, // 30 seconds between retries
  },
};

export const WEBSITE_CRAWL_JOB_OPTIONS = {
  ...DEFAULT_JOB_OPTIONS,
  attempts: 2,
  backoff: {
    type: "exponential" as const,
    delay: 60000, // 60 seconds between retries
  },
};

export const WEBSITE_PAGE_PARSE_JOB_OPTIONS = {
  ...DEFAULT_JOB_OPTIONS,
  attempts: 2,
  backoff: {
    type: "exponential" as const,
    delay: 30000, // 30 seconds between retries
  },
};
