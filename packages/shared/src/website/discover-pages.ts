import { parseSitemap } from "./parse-sitemap.js";
import { crawlLinks } from "./crawl-links.js";
import { filterContentPages, sortByContentLikelihood } from "./url-filters.js";

export interface DiscoverPagesOptions {
  maxPages: number;
  filterPatterns?: string[];
  existingUrls?: Set<string>;
}

export interface DiscoveredPage {
  url: string;
  title?: string;
  isNew: boolean;
}

/**
 * Discover pages on a website. Tries sitemap first, falls back to link crawling.
 * Merges, deduplicates, filters, and limits results.
 */
export async function discoverPages(
  rootUrl: string,
  options: DiscoverPagesOptions
): Promise<DiscoveredPage[]> {
  const { maxPages, filterPatterns = [], existingUrls = new Set() } = options;
  const parsed = new URL(rootUrl);
  const domain = parsed.hostname.replace(/^www\./, "");

  console.log(`Discovering pages for ${rootUrl} (max: ${maxPages})`);

  // Try sitemap first
  let sitemapUrls = await parseSitemap(rootUrl);
  console.log(`Sitemap yielded ${sitemapUrls.length} URLs`);

  let allUrls: string[];

  if (sitemapUrls.length >= 5) {
    allUrls = sitemapUrls;
  } else {
    // Fallback to link crawling
    console.log("Sitemap insufficient, falling back to link crawling");
    const crawledUrls = await crawlLinks(rootUrl, maxPages);
    console.log(`Link crawling yielded ${crawledUrls.length} URLs`);

    // Merge and deduplicate
    const urlSet = new Set([...sitemapUrls, ...crawledUrls]);
    allUrls = Array.from(urlSet);
  }

  // Filter to content pages only
  const filteredUrls = filterContentPages(allUrls, domain, filterPatterns);
  console.log(`After filtering: ${filteredUrls.length} content pages`);

  // Sort by content likelihood (articles first, categories last)
  const sortedUrls = sortByContentLikelihood(filteredUrls);

  // Limit to maxPages
  const limitedUrls = sortedUrls.slice(0, maxPages);

  // Mark new vs existing
  return limitedUrls.map((url) => ({
    url,
    isNew: !existingUrls.has(url),
  }));
}
