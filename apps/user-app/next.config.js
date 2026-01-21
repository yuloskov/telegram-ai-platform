/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */
if (!process.env.SKIP_ENV_VALIDATION) {
  await import("./src/env.js");
}

const isDev = process.env.NODE_ENV === "development";

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  // Only use standalone output for production builds
  ...(isDev ? {} : { output: "standalone" }),

  i18n: {
    locales: ["en", "ru"],
    defaultLocale: "en",
  },

  // Native modules that shouldn't be bundled by webpack
  serverExternalPackages: ["@resvg/resvg-js"],

  // Transpile all workspace packages for proper hot reload
  transpilePackages: [
    "@repo/database",
    "@repo/shared",
    "@repo/telegram-bot",
    "@repo/ai",
  ],

  // Enable watching for symlinked workspace packages
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        followSymlinks: true,
      };
      config.snapshot = {
        ...(config.snapshot ?? {}),
        managedPaths: [],
      };
    }

    // Externalize native modules on the server
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        "@resvg/resvg-js": "commonjs @resvg/resvg-js",
      });
    }

    return config;
  },
};

export default config;
