export const AUTH_CODE_LENGTH = 6;
export const AUTH_CODE_EXPIRY_MINUTES = 5;

export const JWT_EXPIRY = "7d";
export const JWT_ADMIN_EXPIRY = "24h";

export const POST_STATUSES = {
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  PENDING_REVIEW: "pending_review",
  PUBLISHING: "publishing",
  PUBLISHED: "published",
  FAILED: "failed",
} as const;

export const GENERATION_TYPES = {
  MANUAL: "manual",
  FROM_PROMPT: "from_prompt",
  FROM_SCRAPED: "from_scraped",
  FROM_RESEARCH: "from_research",
  AUTO_RESEARCH: "auto_research",
  AUTO_SCRAPED: "auto_scraped",
} as const;

export const CHANNEL_TONES = {
  PROFESSIONAL: "professional",
  CASUAL: "casual",
  HUMOROUS: "humorous",
  INFORMATIVE: "informative",
  INSPIRATIONAL: "inspirational",
} as const;

export const SUPPORTED_LANGUAGES = {
  EN: "en",
  RU: "ru",
} as const;

export const MAX_RETRY_ATTEMPTS = 3;
export const PUBLISH_RETRY_DELAY_MS = 5000;

export const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;
export const TELEGRAM_MAX_CAPTION_LENGTH = 1024;
export const TELEGRAM_MAX_IMAGES_PER_POST = 10;

export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export const MAX_IMAGE_SIZE_MB = 10;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

export const PENDING_REVIEW_EXPIRY_HOURS = 24;
