import type { NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";

const BulkDeleteSchema = z.object({
  postIds: z.array(z.string()).min(1),
});

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<{ deleted: number }>>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { user } = req;

  const parseResult = BulkDeleteSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: parseResult.error.errors[0]?.message ?? "Validation error",
    });
  }

  const { postIds } = parseResult.data;

  // Find all posts that belong to user and are drafts
  const posts = await prisma.post.findMany({
    where: {
      id: { in: postIds },
      status: "draft",
      channel: { userId: user.id },
    },
    select: { id: true },
  });

  if (posts.length === 0) {
    return res.status(400).json({
      success: false,
      error: "No deletable posts found (only drafts can be deleted)",
    });
  }

  const idsToDelete = posts.map((p) => p.id);

  // Delete all matching posts
  const result = await prisma.post.deleteMany({
    where: { id: { in: idsToDelete } },
  });

  return res.status(200).json({
    success: true,
    data: { deleted: result.count },
  });
}

export default withAuth(handler);
