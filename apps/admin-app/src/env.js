import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    REDIS_URL: z.string().url().optional(),
    JWT_SECRET: z.string().min(32),
    TELEGRAM_BOT_TOKEN: z.string().min(1),
    TELEGRAM_API_ID: z.string().optional(),
    TELEGRAM_API_HASH: z.string().optional(),
  },

  client: {
    NEXT_PUBLIC_USER_APP_URL: z.string().url().default("http://localhost:3000"),
    NEXT_PUBLIC_ADMIN_APP_URL: z.string().url().default("http://localhost:3001"),
  },

  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    REDIS_URL: process.env.REDIS_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_API_ID: process.env.TELEGRAM_API_ID,
    TELEGRAM_API_HASH: process.env.TELEGRAM_API_HASH,
    NEXT_PUBLIC_USER_APP_URL: process.env.NEXT_PUBLIC_USER_APP_URL,
    NEXT_PUBLIC_ADMIN_APP_URL: process.env.NEXT_PUBLIC_ADMIN_APP_URL,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
