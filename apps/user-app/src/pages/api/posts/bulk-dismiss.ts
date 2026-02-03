import type { NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";

const BulkDismissSchema = z.object({
  postIds: z.array(z.string()).min(1).max(100),
});

interface BulkDismissResponse {
  dismissedCount: number;
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<BulkDismissResponse>>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { user } = req;

  const parseResult = BulkDismissSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: parseResult.error.errors.map((e) => e.message).join(", "),
    });
  }

  const { postIds } = parseResult.data;

  // Verify all posts belong to the user and are skipped
  const posts = await prisma.post.findMany({
    where: {
      id: { in: postIds },
      skippedAt: { not: null },
    },
    include: {
      channel: {
        select: { userId: true },
      },
    },
  });

  const unauthorized = posts.find((p) => p.channel.userId !== user.id);
  if (unauthorized) {
    return res.status(403).json({
      success: false,
      error: "Access denied to one or more posts",
    });
  }

  // Delete skipped posts (they were never published, so safe to delete)
  const deleteResult = await prisma.post.deleteMany({
    where: {
      id: { in: posts.map((p) => p.id) },
    },
  });

  return res.status(200).json({
    success: true,
    data: {
      dismissedCount: deleteResult.count,
    },
  });
}

export default withAuth(handler);
