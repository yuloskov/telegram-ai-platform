import type { NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";

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
  res: NextApiResponse<ApiResponse<AssetResponse>>
) {
  const { user } = req;
  const { id: channelId, assetId } = req.query;

  if (typeof channelId !== "string" || typeof assetId !== "string") {
    return res.status(400).json({ success: false, error: "Invalid IDs" });
  }

  // Verify channel ownership
  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: user.id },
  });

  if (!channel) {
    return res.status(404).json({ success: false, error: "Channel not found" });
  }

  const asset = await prisma.personaAsset.findFirst({
    where: { id: assetId, channelId },
  });

  if (!asset) {
    return res.status(404).json({ success: false, error: "Asset not found" });
  }

  if (req.method === "PATCH") {
    const { label, description } = req.body;

    const updated = await prisma.personaAsset.update({
      where: { id: assetId },
      data: {
        ...(label !== undefined && { label }),
        ...(description !== undefined && { description }),
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        id: updated.id,
        label: updated.label,
        description: updated.description,
        imageUrl: updated.imageUrl,
        mimeType: updated.mimeType,
        sortOrder: updated.sortOrder,
      },
    });
  }

  if (req.method === "DELETE") {
    await prisma.personaAsset.delete({ where: { id: assetId } });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withAuth(handler);
