import { XMLParser } from "fast-xml-parser";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface SitemapEntry {
  loc: string;
  lastmod?: string;
}

/**
 * Parse sitemap.xml from a website root URL and extract page URLs.
 * Handles sitemap index files (nested sitemaps, up to 2 levels).
 */
export async function parseSitemap(rootUrl: string): Promise<string[]> {
  const parsed = new URL(rootUrl);
  const domain = parsed.hostname.replace(/^www\./, "");
  const sitemapUrl = `${parsed.protocol}//${parsed.host}/sitemap.xml`;

  try {
    const urls = await fetchSitemapUrls(sitemapUrl, 0);
    // Filter same-domain only
    return urls.filter((url) => {
      try {
        const u = new URL(url);
        return u.hostname.replace(/^www\./, "") === domain;
      } catch {
        return false;
      }
    });
  } catch (error) {
    console.log(`Sitemap fetch failed for ${sitemapUrl}:`, error);
    return [];
  }
}

async function fetchSitemapUrls(url: string, depth: number): Promise<string[]> {
  if (depth > 2) return [];

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/xml, text/xml, */*" },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) return [];

  const text = await response.text();
  const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });
  const result = parser.parse(text);

  // Sitemap index: follow nested sitemaps
  if (result.sitemapindex?.sitemap) {
    const sitemaps = Array.isArray(result.sitemapindex.sitemap)
      ? result.sitemapindex.sitemap
      : [result.sitemapindex.sitemap];

    const allUrls: string[] = [];
    for (const sm of sitemaps) {
      const smUrl = sm.loc;
      if (typeof smUrl === "string") {
        const nested = await fetchSitemapUrls(smUrl, depth + 1);
        allUrls.push(...nested);
      }
    }
    return allUrls;
  }

  // Regular sitemap: extract URLs
  if (result.urlset?.url) {
    const entries: SitemapEntry[] = Array.isArray(result.urlset.url)
      ? result.urlset.url
      : [result.urlset.url];

    return entries.map((e) => e.loc).filter((loc): loc is string => typeof loc === "string");
  }

  return [];
}
