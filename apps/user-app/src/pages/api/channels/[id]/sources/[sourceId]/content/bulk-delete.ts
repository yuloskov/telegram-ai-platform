import type { NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";

const BulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1),
});

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<{ deletedCount: number }>>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { user } = req;
  const { id: channelId, sourceId } = req.query;

  if (typeof channelId !== "string" || typeof sourceId !== "string") {
    return res.status(400).json({ success: false, error: "Invalid IDs" });
  }

  const parseResult = BulkDeleteSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: parseResult.error.errors.map((e) => e.message).join(", "),
    });
  }

  const { ids } = parseResult.data;

  // Verify channel ownership
  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: user.id },
  });

  if (!channel) {
    return res.status(404).json({ success: false, error: "Channel not found" });
  }

  // Verify source belongs to channel
  const source = await prisma.contentSource.findFirst({
    where: { id: sourceId, channelId },
  });

  if (!source) {
    return res.status(404).json({ success: false, error: "Source not found" });
  }

  // Delete chunks that belong to this source
  const result = await prisma.scrapedContent.deleteMany({
    where: {
      id: { in: ids },
      sourceId,
    },
  });

  return res.status(200).json({
    success: true,
    data: { deletedCount: result.count },
  });
}

export default withAuth(handler);
