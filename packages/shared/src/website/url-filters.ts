// Built-in path patterns to exclude (non-content pages)
const EXCLUDED_PATH_PATTERNS = [
  /^\/about\/?$/i,
  /^\/contact\/?$/i,
  /^\/terms\/?$/i,
  /^\/privacy\/?$/i,
  /^\/cookie/i,
  /^\/legal/i,
  /^\/login\/?$/i,
  /^\/register\/?$/i,
  /^\/signup\/?$/i,
  /^\/search\/?$/i,
  /^\/cart\/?$/i,
  /^\/checkout\/?$/i,
  /^\/account\/?$/i,
  /\/tag\//i,
  /\/category\//i,
  /\/author\//i,
  /\/page\/\d+/i,
  /\/feed\/?$/i,
  /\/rss\/?$/i,
  /\/sitemap/i,
  /\/wp-admin/i,
  /\/wp-login/i,
  /\/wp-json/i,
  /\/api\//i,
  /\/cdn-cgi\//i,
];

// File extensions to exclude
const EXCLUDED_EXTENSIONS = [
  ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp",
  ".mp3", ".mp4", ".avi", ".mov", ".zip", ".rar", ".gz",
  ".css", ".js", ".xml", ".json", ".ico", ".woff", ".woff2",
  ".ttf", ".eot",
];

/**
 * Filter URLs to keep only likely content pages.
 * Removes non-content URLs like about, contact, login, tags, etc.
 */
export function filterContentPages(
  urls: string[],
  domain: string,
  customPatterns: string[] = []
): string[] {
  const customRegexes = customPatterns
    .filter((p) => p.trim().length > 0)
    .map((p) => {
      try {
        return new RegExp(p, "i");
      } catch {
        return null;
      }
    })
    .filter((r): r is RegExp => r !== null);

  return urls.filter((url) => {
    try {
      const parsed = new URL(url);

      // Same domain only
      const urlDomain = parsed.hostname.replace(/^www\./, "");
      if (urlDomain !== domain) return false;

      const path = parsed.pathname;

      // Skip root page
      if (path === "/" || path === "") return false;

      // Skip excluded extensions
      const lowerPath = path.toLowerCase();
      if (EXCLUDED_EXTENSIONS.some((ext) => lowerPath.endsWith(ext))) return false;

      // Skip URLs with query params (usually pagination/filters)
      if (parsed.search.length > 0) return false;

      // Skip fragment-only URLs
      if (parsed.hash.length > 0 && path === "/") return false;

      // Skip built-in excluded patterns
      if (EXCLUDED_PATH_PATTERNS.some((pattern) => pattern.test(path))) return false;

      // Skip custom exclusion patterns
      if (customRegexes.some((regex) => regex.test(url) || regex.test(path))) return false;

      return true;
    } catch {
      return false;
    }
  });
}
