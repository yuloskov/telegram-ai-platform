import type { NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";

interface RecentPostResponse {
  id: string;
  content: string;
  publishedAt: string;
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<RecentPostResponse[]>>
) {
  const { user } = req;
  const { id: channelId } = req.query;

  if (typeof channelId !== "string") {
    return res.status(400).json({ success: false, error: "Invalid channel ID" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Verify channel ownership
  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: user.id },
  });

  if (!channel) {
    return res.status(404).json({ success: false, error: "Channel not found" });
  }

  // Fetch last 10 published posts for auto-context
  const posts = await prisma.post.findMany({
    where: {
      channelId,
      status: "published",
    },
    orderBy: { publishedAt: "desc" },
    take: 10,
    select: {
      id: true,
      content: true,
      publishedAt: true,
    },
  });

  return res.status(200).json({
    success: true,
    data: posts
      .filter((post) => post.publishedAt !== null)
      .map((post) => ({
        id: post.id,
        content: post.content,
        publishedAt: post.publishedAt!.toISOString(),
      })),
  });
}

export default withAuth(handler);
