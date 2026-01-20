// Media utility functions - consolidated from duplicated implementations

/**
 * Get the correct image src URL.
 * - Full external URLs (http/https) - use directly
 * - Already prefixed with /api/media/ - use directly
 * - Storage paths - add /api/media/ prefix
 */
export function getMediaSrc(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  if (url.startsWith("/api/media/")) {
    return url;
  }
  return `/api/media/${url}`;
}

/**
 * Check if a URL is a skipped media type (video or document).
 */
export function isSkippedMedia(url: string): boolean {
  return url.startsWith("skipped:video_or_document");
}

/**
 * Check if a URL represents failed media.
 */
export function isFailedMedia(url: string): boolean {
  return url.startsWith("failed:");
}

/**
 * Check if a URL is invalid for display (skipped or failed).
 */
export function isInvalidMedia(url: string): boolean {
  return url.startsWith("skipped:") || url.startsWith("failed:");
}

/**
 * Check if content is video-only (has video but no text and no displayable images).
 * Used to filter out posts that cannot be displayed meaningfully.
 */
export function isVideoOnly(
  text: string | null | undefined,
  mediaUrls: string[] = []
): boolean {
  const hasText = text && text.trim().length > 0;
  if (hasText) return false;
  if (mediaUrls.length === 0) return false;
  return mediaUrls.every(isSkippedMedia);
}

/**
 * Check if a post object is video-only.
 * Convenience function for filtering arrays of posts.
 */
export function isPostVideoOnly(post: {
  text: string | null;
  mediaUrls: string[];
}): boolean {
  return isVideoOnly(post.text, post.mediaUrls);
}

/**
 * Filter media URLs to get only valid, displayable URLs.
 */
export function getValidMediaUrls(urls: string[]): string[] {
  return urls.filter((url) => !isInvalidMedia(url));
}

/**
 * Filter media URLs to get only valid image URLs (not video/documents).
 */
export function getValidImageUrls(urls: string[]): string[] {
  return urls.filter((url) => !isSkippedMedia(url) && !isFailedMedia(url));
}

/**
 * Get the first valid thumbnail URL from media URLs, or null if none available.
 */
export function getThumbnailUrl(urls: string[]): string | null {
  const validUrls = getValidMediaUrls(urls);
  return validUrls[0] ?? null;
}
