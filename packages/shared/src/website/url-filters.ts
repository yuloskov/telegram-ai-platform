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
 * Score how likely a URL is to be a content/article page (vs category/navigation).
 * Higher score = more likely to be an article.
 */
export function scoreContentLikelihood(url: string): number {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    const segments = path.split("/").filter((s) => s.length > 0);
    let score = 0;

    // Has numeric segment (article IDs like /77009/)
    if (segments.some((s) => /^\d+$/.test(s))) score += 3;

    // Has long slug segment (>20 chars with hyphens, like article titles)
    if (segments.some((s) => s.includes("-") && s.length > 20)) score += 2;

    // Has .html/.htm extension
    if (/\.html?$/i.test(path)) score += 1;

    // Has 4+ path segments (deep = likely article)
    if (segments.length >= 4) score += 1;

    // Only 1-2 segments (likely navigational/category)
    if (segments.length <= 2) score -= 2;

    return score;
  } catch {
    return 0;
  }
}

/**
 * Sort URLs by content likelihood score (highest first).
 */
export function sortByContentLikelihood(urls: string[]): string[] {
  return [...urls].sort(
    (a, b) => scoreContentLikelihood(b) - scoreContentLikelihood(a)
  );
}

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
