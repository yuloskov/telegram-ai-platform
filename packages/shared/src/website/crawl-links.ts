import * as cheerio from "cheerio";
import { fetchWebpage } from "../webpage/fetch-webpage.js";

const MAX_DEPTH = 3;
const RATE_LIMIT_MS = 1000; // 1 request per second

/**
 * BFS link crawl from root page, extracting internal links.
 * Same-domain only, limited depth and page count.
 */
export async function crawlLinks(
  rootUrl: string,
  maxPages: number
): Promise<string[]> {
  const parsed = new URL(rootUrl);
  const domain = parsed.hostname.replace(/^www\./, "");
  const baseOrigin = parsed.origin;

  const discovered = new Set<string>();
  const queue: Array<{ url: string; depth: number }> = [{ url: rootUrl, depth: 0 }];
  const visited = new Set<string>();

  discovered.add(rootUrl);

  while (queue.length > 0 && discovered.size < maxPages) {
    const item = queue.shift();
    if (!item) break;
    if (visited.has(item.url)) continue;
    if (item.depth > MAX_DEPTH) continue;

    visited.add(item.url);

    try {
      const result = await fetchWebpage(item.url, { timeout: 15000 });
      const $ = cheerio.load(result.html);

      $("a[href]").each((_, el) => {
        if (discovered.size >= maxPages) return false;

        const href = $(el).attr("href");
        if (!href) return;

        try {
          const resolved = new URL(href, baseOrigin);
          // Same domain only
          if (resolved.hostname.replace(/^www\./, "") !== domain) return;
          // Strip hash and trailing slash for dedup
          resolved.hash = "";
          const normalized = resolved.href.replace(/\/+$/, "");

          if (!discovered.has(normalized)) {
            discovered.add(normalized);
            if (!visited.has(normalized) && item.depth + 1 <= MAX_DEPTH) {
              queue.push({ url: normalized, depth: item.depth + 1 });
            }
          }
        } catch {
          // Invalid URL, skip
        }
      });

      // Rate limit
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS));
    } catch (error) {
      console.log(`Failed to crawl ${item.url}:`, error);
    }
  }

  return Array.from(discovered);
}
