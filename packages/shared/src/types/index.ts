import { z } from "zod";

// User types
export const UserSchema = z.object({
  id: z.string(),
  telegramId: z.bigint(),
  username: z.string().nullable(),
  displayName: z.string().nullable(),
  language: z.string(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

// Auth types
export const AuthCodeSchema = z.object({
  id: z.string(),
  code: z.string(),
  expiresAt: z.date(),
  used: z.boolean(),
  userId: z.string().nullable(),
});

export type AuthCode = z.infer<typeof AuthCodeSchema>;

export interface JWTPayload {
  sub: string;
  telegramId: string;
  type: "user" | "admin";
  iat?: number;
  exp?: number;
}

// Channel types
export const ChannelSettingsSchema = z.object({
  niche: z.string().optional(),
  tone: z.enum(["professional", "casual", "humorous", "informative", "inspirational"]),
  language: z.string(),
  hashtags: z.array(z.string()),
});

export type ChannelSettings = z.infer<typeof ChannelSettingsSchema>;

export const CreateChannelSchema = z.object({
  telegramId: z.union([z.string(), z.number()]).transform((val) => BigInt(val)),
  username: z.string().optional(),
  title: z.string().min(1),
  niche: z.string().optional(),
  tone: z.string().default("professional"),
  language: z.string().default("en"),
  hashtags: z.array(z.string()).default([]),
});

export type CreateChannel = z.infer<typeof CreateChannelSchema>;

// Content Source types
export const CreateContentSourceSchema = z.object({
  telegramUsername: z.string().min(1),
});

export type CreateContentSource = z.infer<typeof CreateContentSourceSchema>;

// Post types
export const PostStatusSchema = z.enum([
  "draft",
  "scheduled",
  "pending_review",
  "publishing",
  "published",
  "failed",
]);

export type PostStatus = z.infer<typeof PostStatusSchema>;

export const CreatePostSchema = z.object({
  content: z.string().min(1).max(4096),
  scheduledAt: z.string().datetime().optional(),
  mediaFileIds: z.array(z.string()).optional(),
});

export type CreatePost = z.infer<typeof CreatePostSchema>;

export const UpdatePostSchema = z.object({
  content: z.string().min(1).max(4096).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  status: PostStatusSchema.optional(),
});

export type UpdatePost = z.infer<typeof UpdatePostSchema>;

// Generation types
export const GenerateFromPromptSchema = z.object({
  prompt: z.string().min(1).max(2000),
  additionalInstructions: z.string().max(1000).optional(),
});

export type GenerateFromPrompt = z.infer<typeof GenerateFromPromptSchema>;

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Notification types
export type NotificationType =
  | "publish_success"
  | "publish_failure"
  | "scraping_complete"
  | "scheduled_reminder"
  | "auto_post_review"
  | "system_alert";

export interface NotificationPayload {
  type: NotificationType;
  userId: string;
  telegramId: bigint;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}
