import type { NextApiRequest, NextApiResponse } from "next";
import { getFileBuffer } from "@repo/shared/storage";

// Map file extensions to MIME types
const mimeTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { path } = req.query;

  if (!path || !Array.isArray(path)) {
    return res.status(400).json({ error: "Invalid path" });
  }

  // path is like ["telegram-platform", "scraped", "TuckerCarlsonNetwork", "177.jpg"]
  // First element is the bucket, rest is the object path
  const [bucket, ...objectParts] = path;
  const objectName = objectParts.join("/");

  if (!bucket || !objectName) {
    return res.status(400).json({ error: "Invalid path" });
  }

  try {
    // Fetch file content from MinIO and proxy to client
    const buffer = await getFileBuffer(bucket, objectName);

    // Determine content type from extension
    const ext = objectName.split(".").pop()?.toLowerCase() ?? "";
    const contentType = mimeTypes[ext] ?? "application/octet-stream";

    // Set caching headers (1 hour browser cache, 1 day CDN cache)
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");

    res.status(200).send(buffer);
  } catch (error) {
    console.error("Failed to get media:", error);
    res.status(404).json({ error: "Media not found" });
  }
}
