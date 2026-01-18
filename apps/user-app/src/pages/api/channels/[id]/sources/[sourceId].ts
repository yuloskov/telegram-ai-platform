import type { NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";

interface ContentSourceDetailResponse {
  id: string;
  telegramUsername: string;
  telegramId: string | null;
  isActive: boolean;
  lastScrapedAt: string | null;
  createdAt: string;
  _count: {
    scrapedContent: number;
  };
}

const UpdateSourceSchema = z.object({
  isActive: z.boolean().optional(),
});

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<ContentSourceDetailResponse>>
) {
  const { user } = req;
  const { id: channelId, sourceId } = req.query;

  if (typeof channelId !== "string" || typeof sourceId !== "string") {
    return res.status(400).json({ success: false, error: "Invalid IDs" });
  }

  // Verify channel ownership
  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: user.id },
  });

  if (!channel) {
    return res.status(404).json({ success: false, error: "Channel not found" });
  }

  // Get the source
  const source = await prisma.contentSource.findFirst({
    where: { id: sourceId, channelId },
    include: {
      _count: {
        select: { scrapedContent: true },
      },
    },
  });

  if (!source) {
    return res.status(404).json({ success: false, error: "Source not found" });
  }

  if (req.method === "GET") {
    return res.status(200).json({
      success: true,
      data: {
        id: source.id,
        telegramUsername: source.telegramUsername,
        telegramId: source.telegramId?.toString() ?? null,
        isActive: source.isActive,
        lastScrapedAt: source.lastScrapedAt?.toISOString() ?? null,
        createdAt: source.createdAt.toISOString(),
        _count: source._count,
      },
    });
  }

  if (req.method === "PATCH") {
    const parseResult = UpdateSourceSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.errors.map((e) => e.message).join(", "),
      });
    }

    const updated = await prisma.contentSource.update({
      where: { id: sourceId },
      data: parseResult.data,
      include: {
        _count: {
          select: { scrapedContent: true },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        id: updated.id,
        telegramUsername: updated.telegramUsername,
        telegramId: updated.telegramId?.toString() ?? null,
        isActive: updated.isActive,
        lastScrapedAt: updated.lastScrapedAt?.toISOString() ?? null,
        createdAt: updated.createdAt.toISOString(),
        _count: updated._count,
      },
    });
  }

  if (req.method === "DELETE") {
    await prisma.contentSource.delete({
      where: { id: sourceId },
    });

    return res.status(200).json({
      success: true,
      data: {
        id: source.id,
        telegramUsername: source.telegramUsername,
        telegramId: source.telegramId?.toString() ?? null,
        isActive: source.isActive,
        lastScrapedAt: source.lastScrapedAt?.toISOString() ?? null,
        createdAt: source.createdAt.toISOString(),
        _count: source._count,
      },
    });
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withAuth(handler);
