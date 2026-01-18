/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  output: "standalone",

  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },

  transpilePackages: [
    "@repo/database",
    "@repo/shared",
    "@repo/telegram",
  ],
};

export default config;
