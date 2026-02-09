import type { NextApiResponse } from "next";
import { IncomingForm, type File } from "formidable";
import { readFile } from "fs/promises";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import { uploadFile } from "@repo/shared/storage";
import type { ApiResponse } from "@repo/shared/types";

export const config = {
  api: { bodyParser: false },
};

const BUCKET_NAME = "telegram-platform";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface AssetResponse {
  id: string;
  label: string;
  description: string | null;
  imageUrl: string;
  mimeType: string | null;
  sortOrder: number;
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<AssetResponse[] | AssetResponse>>
) {
  const { user } = req;
  const { id: channelId } = req.query;

  if (typeof channelId !== "string") {
    return res.status(400).json({ success: false, error: "Invalid channel ID" });
  }

  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: user.id },
  });

  if (!channel) {
    return res.status(404).json({ success: false, error: "Channel not found" });
  }

  if (req.method === "GET") {
    const assets = await prisma.personaAsset.findMany({
      where: { channelId },
      orderBy: { sortOrder: "asc" },
    });

    return res.status(200).json({
      success: true,
      data: assets.map(formatAsset),
    });
  }

  if (req.method === "POST") {
    try {
      const { file, label, description } = await parseAssetForm(req);

      const ext = file.originalFilename?.split(".").pop() || "jpg";
      const objectName = `persona-assets/${channelId}/${Date.now()}.${ext}`;
      const storagePath = await uploadFile(BUCKET_NAME, objectName, file.buffer, file.mimetype);

      const maxOrder = await prisma.personaAsset.aggregate({
        where: { channelId },
        _max: { sortOrder: true },
      });

      const asset = await prisma.personaAsset.create({
        data: {
          channelId,
          label: label || "Photo",
          description: description || null,
          imageUrl: `/api/media/${storagePath}`,
          mimeType: file.mimetype,
          sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        },
      });

      return res.status(201).json({ success: true, data: formatAsset(asset) });
    } catch (error) {
      console.error("Persona asset upload error:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to upload",
      });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

function formatAsset(asset: {
  id: string;
  label: string;
  description: string | null;
  imageUrl: string;
  mimeType: string | null;
  sortOrder: number;
}): AssetResponse {
  return {
    id: asset.id,
    label: asset.label,
    description: asset.description,
    imageUrl: asset.imageUrl,
    mimeType: asset.mimeType,
    sortOrder: asset.sortOrder,
  };
}

interface ParsedAssetFile {
  buffer: Buffer;
  mimetype: string;
  originalFilename: string | null;
}

async function parseAssetForm(
  req: AuthenticatedRequest
): Promise<{ file: ParsedAssetFile; label: string; description: string }> {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      maxFileSize: MAX_FILE_SIZE,
      filter: ({ mimetype }) => ALLOWED_TYPES.includes(mimetype ?? ""),
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        reject(new Error(err.message.includes("maxFileSize") ? "File too large (max 5MB)" : "Upload failed"));
        return;
      }

      const fileArray = files.file;
      const uploaded: File | undefined = Array.isArray(fileArray) ? fileArray[0] : fileArray;

      if (!uploaded || !ALLOWED_TYPES.includes(uploaded.mimetype ?? "")) {
        reject(new Error("Please upload a JPG, PNG, WebP, or GIF image"));
        return;
      }

      try {
        const buffer = await readFile(uploaded.filepath);
        const label = Array.isArray(fields.label) ? fields.label[0] ?? "" : fields.label ?? "";
        const description = Array.isArray(fields.description) ? fields.description[0] ?? "" : fields.description ?? "";

        resolve({
          file: {
            buffer,
            mimetype: uploaded.mimetype ?? "image/jpeg",
            originalFilename: uploaded.originalFilename,
          },
          label,
          description,
        });
      } catch {
        reject(new Error("Failed to read uploaded file"));
      }
    });
  });
}

export default withAuth(handler);
