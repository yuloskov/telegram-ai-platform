import type { NextApiRequest, NextApiResponse } from "next";
import { getFileUrl } from "@repo/shared/storage";

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
    // Generate presigned URL valid for 1 hour
    const url = await getFileUrl(bucket, objectName, 3600);

    // Redirect to the presigned URL
    res.redirect(302, url);
  } catch (error) {
    console.error("Failed to get media URL:", error);
    res.status(404).json({ error: "Media not found" });
  }
}
