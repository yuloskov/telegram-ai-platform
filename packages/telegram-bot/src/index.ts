// Re-export i18n as the main entry point (lightweight, no grammy dependency)
export * from "./i18n";

// Bot functions are available via "@repo/telegram-bot/bot" to avoid
// loading grammy in contexts where it's not needed
