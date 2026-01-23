import type { NextApiResponse } from "next";
import { IncomingForm, type File } from "formidable";
import { readFile } from "fs/promises";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import { uploadFile, generateObjectName } from "@repo/shared/storage";
import { QUEUE_NAMES, DOCUMENT_PARSING_JOB_OPTIONS } from "@repo/shared/queues";
import type { ApiResponse } from "@repo/shared/types";

export const config = {
  api: {
    bodyParser: false,
  },
};

const BUCKET_NAME = "telegram-platform";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface UploadResponse {
  id: string;
  documentName: string;
  status: "processing";
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<UploadResponse>>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { user } = req;
  const { id: channelId } = req.query;

  if (typeof channelId !== "string") {
    return res.status(400).json({ success: false, error: "Invalid channel ID" });
  }

  // Verify channel ownership
  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: user.id },
  });

  if (!channel) {
    return res.status(404).json({ success: false, error: "Channel not found" });
  }

  try {
    const { file, originalFilename } = await parseFormData(req);

    // Create the content source
    const source = await prisma.contentSource.create({
      data: {
        channelId,
        sourceType: "document",
        documentName: originalFilename,
        documentUrl: file.storagePath,
        documentMimeType: file.mimetype,
        documentSize: file.size,
      },
    });

    // Queue the parsing job
    const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
    const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    const queue = new Queue(QUEUE_NAMES.DOCUMENT_PARSING, { connection });

    await queue.add(
      `parse-${source.id}`,
      { sourceId: source.id, documentUrl: file.storagePath },
      DOCUMENT_PARSING_JOB_OPTIONS
    );

    await queue.close();
    await connection.quit();

    return res.status(201).json({
      success: true,
      data: {
        id: source.id,
        documentName: originalFilename,
        status: "processing",
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload document",
    });
  }
}

interface ParsedFile {
  storagePath: string;
  mimetype: string;
  size: number;
}

async function parseFormData(
  req: AuthenticatedRequest
): Promise<{ file: ParsedFile; originalFilename: string }> {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      maxFileSize: MAX_FILE_SIZE,
      filter: ({ mimetype }) => {
        return mimetype === "application/pdf";
      },
    });

    form.parse(req, async (err, _fields, files) => {
      if (err) {
        if (err.message.includes("maxFileSize")) {
          reject(new Error("File size exceeds 10MB limit"));
        } else {
          reject(new Error("Failed to parse upload"));
        }
        return;
      }

      const fileArray = files.file;
      const file: File | undefined = Array.isArray(fileArray)
        ? fileArray[0]
        : fileArray;

      if (!file) {
        reject(new Error("No file uploaded"));
        return;
      }

      if (file.mimetype !== "application/pdf") {
        reject(new Error("Only PDF files are allowed"));
        return;
      }

      try {
        const buffer = await readFile(file.filepath);
        const objectName = generateObjectName(
          "documents",
          file.originalFilename ?? "document.pdf",
          Date.now().toString()
        );

        const storagePath = await uploadFile(
          BUCKET_NAME,
          objectName,
          buffer,
          file.mimetype
        );

        resolve({
          file: {
            storagePath,
            mimetype: file.mimetype,
            size: file.size,
          },
          originalFilename: file.originalFilename ?? "document.pdf",
        });
      } catch (uploadErr) {
        reject(new Error("Failed to upload file to storage"));
      }
    });
  });
}

export default withAuth(handler);
