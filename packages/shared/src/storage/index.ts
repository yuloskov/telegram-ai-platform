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

export function generateObjectName(
  prefix: string,
  filename: string,
  id: string
): string {
  const ext = filename.split(".").pop() || "bin";
  const timestamp = Date.now();
  return `${prefix}/${id}/${timestamp}.${ext}`;
}
