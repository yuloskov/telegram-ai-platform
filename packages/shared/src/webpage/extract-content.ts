import * as cheerio from "cheerio";

export interface ExtractedContent {
  title: string;
  domain: string;
  content: string;
}

export interface ExtractContentOptions {
  /**
   * If true, use minimal filtering - only remove scripts/styles/meta
   * but keep all actual content (nav, header, footer, etc.)
   */
  fullExtraction?: boolean;
}

type CheerioSelection = ReturnType<ReturnType<typeof cheerio.load>>;

// Tags to ALWAYS remove (never contain readable content)
const ALWAYS_REMOVE_TAGS = [
  "script",
  "style",
  "noscript",
  "link",
  "meta",
  "template",
  "svg",
  "canvas",
  "iframe",
];

// Tags to remove in selective mode only (may contain nav/chrome)
const SELECTIVE_REMOVE_TAGS = [
  "nav",
  "header",
  "footer",
  "aside",
  "form",
  "button",
  "input",
  "select",
  "textarea",
  "video",
  "audio",
];

// Selectors for elements to remove in selective mode (ads, navigation, etc.)
const SELECTIVE_REMOVE_SELECTORS = [
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
 * @param html - The HTML content to extract from
 * @param url - The URL of the page (used for domain extraction)
 * @param options - Extraction options
 */
export function extractContent(
  html: string,
  url: string,
  options: ExtractContentOptions = {}
): ExtractedContent {
  const { fullExtraction = false } = options;
  const $ = cheerio.load(html);
  const parsedUrl = new URL(url);
  const domain = parsedUrl.hostname.replace(/^www\./, "");

  // Extract title before removing elements
  const title =
    $("meta[property='og:title']").attr("content") ||
    $("meta[name='twitter:title']").attr("content") ||
    $("h1").first().text().trim() ||
    $("title").text().trim() ||
    "Untitled";

  // Always remove non-content tags (scripts, styles, etc.)
  ALWAYS_REMOVE_TAGS.forEach((tag) => $(tag).remove());

  // In selective mode, also remove navigation/chrome elements
  if (!fullExtraction) {
    SELECTIVE_REMOVE_TAGS.forEach((tag) => $(tag).remove());
    SELECTIVE_REMOVE_SELECTORS.forEach((selector) => $(selector).remove());
  }

  let contentElement: CheerioSelection | null = null;

  if (fullExtraction) {
    // In full extraction mode, use body to capture everything
    contentElement = $("body");
  } else {
    // Try to find main content container
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
  }

  // Extract text content
  const content = fullExtraction
    ? extractTextContentFull($, contentElement)
    : extractTextContent($, contentElement);

  return {
    title: cleanTitle(title),
    domain,
    content: content.trim(),
  };
}

/**
 * Extract clean text from element (selective mode)
 * Looks for specific content tags
 */
function extractTextContent(
  $: cheerio.CheerioAPI,
  element: CheerioSelection
): string {
  const blocks: string[] = [];

  // Process headings and paragraphs
  element.find("h1, h2, h3, h4, h5, h6, p, li, blockquote, pre, td, th, div").each((_, el) => {
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
 * Extract ALL text content from element (full extraction mode)
 * More aggressive - walks the DOM tree to capture everything
 */
function extractTextContentFull(
  $: cheerio.CheerioAPI,
  element: CheerioSelection
): string {
  const blocks: string[] = [];
  const seen = new Set<string>();

  // Walk through all elements and extract text
  element.find("*").each((_, el) => {
    const $el = $(el);
    const tagName = el.tagName?.toLowerCase() ?? "";

    // Skip hidden elements
    if ($el.css("display") === "none" || $el.attr("hidden") !== undefined) {
      return;
    }

    // Get direct text content (excluding children's text)
    const directText = $el
      .contents()
      .filter((_, node) => node.type === "text")
      .text()
      .trim();

    if (directText.length > 0) {
      // Deduplicate text blocks
      const normalized = directText.replace(/\s+/g, " ");
      if (!seen.has(normalized)) {
        seen.add(normalized);

        // Add heading markers for semantic structure
        if (tagName.startsWith("h") && tagName.length === 2) {
          blocks.push(`\n${directText}\n`);
        } else {
          blocks.push(directText);
        }
      }
    }
  });

  // If no content found via walking, fallback to full text
  if (blocks.length === 0) {
    return element.text().replace(/\s+/g, " ").trim();
  }

  return blocks
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+/g, " ")
    .replace(/\n /g, "\n")
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
