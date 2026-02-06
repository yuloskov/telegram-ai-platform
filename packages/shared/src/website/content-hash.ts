import { createHash } from "crypto";

/**
 * Create a SHA-256 hash of normalized text content for change detection.
 */
export function hashContent(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
  return createHash("sha256").update(normalized).digest("hex");
}
