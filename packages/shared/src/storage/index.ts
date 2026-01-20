import { Client } from "minio";

let minioClient: Client | null = null;

export function getMinioClient(): Client {
  if (minioClient) return minioClient;

  const endpoint = process.env.MINIO_ENDPOINT;
  const port = process.env.MINIO_PORT;
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;

  if (!endpoint || !accessKey || !secretKey) {
    throw new Error("MinIO environment variables are not configured");
  }

  minioClient = new Client({
    endPoint: endpoint,
    port: port ? parseInt(port, 10) : 9000,
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey,
    secretKey,
  });

  return minioClient;
}

export async function ensureBucket(bucketName: string): Promise<void> {
  const client = getMinioClient();
  const exists = await client.bucketExists(bucketName);
  if (!exists) {
    await client.makeBucket(bucketName);
  }
}

export async function uploadFile(
  bucketName: string,
  objectName: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const client = getMinioClient();
  await ensureBucket(bucketName);

  await client.putObject(bucketName, objectName, buffer, buffer.length, {
    "Content-Type": contentType,
  });

  return `${bucketName}/${objectName}`;
}

export async function getFileUrl(
  bucketName: string,
  objectName: string,
  expirySeconds = 3600
): Promise<string> {
  const client = getMinioClient();
  return client.presignedGetObject(bucketName, objectName, expirySeconds);
}

export async function deleteFile(
  bucketName: string,
  objectName: string
): Promise<void> {
  const client = getMinioClient();
  await client.removeObject(bucketName, objectName);
}

/**
 * Get file as Buffer from MinIO
 */
export async function getFileBuffer(
  bucketName: string,
  objectName: string
): Promise<Buffer> {
  const client = getMinioClient();
  const stream = await client.getObject(bucketName, objectName);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

/**
 * Convert a storage path to a base64 data URL
 * @param storagePath - Path like "telegram-platform/scraped/channel/123.jpg"
 * @returns Base64 data URL like "data:image/jpeg;base64,..."
 */
export async function storagePathToBase64(storagePath: string): Promise<string> {
  // Parse bucket and object name from path
  const parts = storagePath.split("/");
  const bucket = parts[0];
  const objectName = parts.slice(1).join("/");

  if (!bucket || !objectName) {
    throw new Error(`Invalid storage path: ${storagePath}`);
  }

  const buffer = await getFileBuffer(bucket, objectName);

  // Determine MIME type from extension
  const ext = objectName.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
  };
  const mime = mimeTypes[ext ?? ""] ?? "image/jpeg";

  return `data:${mime};base64,${buffer.toString("base64")}`;
}

export function generateObjectName(
  prefix: string,
  filename: string,
  id: string
): string {
  const ext = filename.split(".").pop() || "bin";
  const timestamp = Date.now();
  return `${prefix}/${id}/${timestamp}.${ext}`;
}
