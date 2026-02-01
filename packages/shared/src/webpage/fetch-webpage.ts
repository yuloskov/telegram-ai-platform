export interface FetchWebpageResult {
  html: string;
  url: string;
  title?: string;
}

export interface FetchWebpageError {
  message: string;
  statusCode?: number;
}

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Fetch HTML content from a web page with timeout and error handling
 */
export async function fetchWebpage(
  url: string,
  options?: { timeout?: number }
): Promise<FetchWebpageResult> {
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  // Only allow http/https
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error(`Invalid protocol: ${parsedUrl.protocol}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    const html = await response.text();

    return {
      html,
      url: response.url, // Final URL after redirects
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error(`Request timed out after ${timeout}ms`);
      }
      throw error;
    }
    throw new Error("Failed to fetch webpage");
  } finally {
    clearTimeout(timeoutId);
  }
}
