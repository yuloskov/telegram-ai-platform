import * as cheerio from "cheerio";

export interface ExtractedContent {
  title: string;
  domain: string;
  content: string;
}

type CheerioSelection = ReturnType<ReturnType<typeof cheerio.load>>;

// Tags to remove completely
const REMOVE_TAGS = [
  "script",
  "style",
  "noscript",
  "iframe",
  "nav",
  "header",
  "footer",
  "aside",
  "form",
  "button",
  "input",
  "select",
  "textarea",
  "svg",
  "canvas",
  "video",
  "audio",
];

// Selectors for elements to remove (ads, navigation, etc.)
const REMOVE_SELECTORS = [
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '[role="complementary"]',
  ".nav",
  ".navbar",
  ".sidebar",
  ".advertisement",
  ".ad",
  ".ads",
  ".social-share",
  ".comments",
  ".related-posts",
  ".footer",
  ".header",
  "#nav",
  "#header",
  "#footer",
  "#sidebar",
  "#comments",
];

// Content containers in order of priority
const CONTENT_SELECTORS = [
  "article",
  '[role="main"]',
  "main",
  ".post-content",
  ".article-content",
  ".entry-content",
  ".content",
  ".post",
  ".article",
  "#content",
  "#main",
];

/**
 * Extract main content from HTML
 */
export function extractContent(html: string, url: string): ExtractedContent {
  const $ = cheerio.load(html);
  const parsedUrl = new URL(url);
  const domain = parsedUrl.hostname.replace(/^www\./, "");

  // Extract title
  const title =
    $("meta[property='og:title']").attr("content") ||
    $("meta[name='twitter:title']").attr("content") ||
    $("h1").first().text().trim() ||
    $("title").text().trim() ||
    "Untitled";

  // Remove unwanted elements
  REMOVE_TAGS.forEach((tag) => $(tag).remove());
  REMOVE_SELECTORS.forEach((selector) => $(selector).remove());

  // Try to find main content container
  let contentElement: CheerioSelection | null = null;
  for (const selector of CONTENT_SELECTORS) {
    const el = $(selector).first();
    if (el.length > 0 && el.text().trim().length > 200) {
      contentElement = el;
      break;
    }
  }

  // Fall back to body if no content container found
  if (!contentElement || contentElement.length === 0) {
    contentElement = $("body");
  }

  // Extract text content
  const content = extractTextContent($, contentElement);

  return {
    title: cleanTitle(title),
    domain,
    content: content.trim(),
  };
}

/**
 * Extract clean text from element
 */
function extractTextContent(
  $: cheerio.CheerioAPI,
  element: CheerioSelection
): string {
  const blocks: string[] = [];

  // Process headings and paragraphs
  element.find("h1, h2, h3, h4, h5, h6, p, li, blockquote, pre, td, th").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 0) {
      const tagName = el.tagName?.toLowerCase() ?? "";

      // Add heading markers
      if (tagName.startsWith("h")) {
        blocks.push(`\n${text}\n`);
      } else {
        blocks.push(text);
      }
    }
  });

  // If no structured content found, get all text
  if (blocks.length === 0) {
    return element.text().replace(/\s+/g, " ").trim();
  }

  return blocks
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Clean and truncate title
 */
function cleanTitle(title: string): string {
  // Remove site name suffixes
  const cleaned = title
    .split(/\s*[|\-–—]\s*/)[0]
    ?.trim()
    .replace(/\s+/g, " ");

  if (!cleaned) return "Untitled";

  return cleaned.length > 150 ? cleaned.substring(0, 147) + "..." : cleaned;
}
