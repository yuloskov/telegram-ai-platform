/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */
import "./src/env.js";

const isDev = process.env.NODE_ENV === "development";

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  // Only use standalone output for production builds
  ...(isDev ? {} : { output: "standalone" }),

  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },

  transpilePackages: [
    "@repo/database",
    "@repo/shared",
    "@repo/telegram-bot",
  ],
};

export default config;
