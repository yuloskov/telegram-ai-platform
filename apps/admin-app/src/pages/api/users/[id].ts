import type { NextApiResponse } from "next";
import { prisma } from "@repo/database";
import { withAdminAuth, type AuthenticatedRequest } from "~/lib/auth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ success: false, error: "Invalid user ID" });
  }

  if (req.method === "GET") {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          channels: {
            select: {
              id: true,
              title: true,
              username: true,
              isActive: true,
              createdAt: true,
              _count: {
                select: { posts: true },
              },
            },
          },
          _count: {
            select: {
              channels: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      // Serialize BigInt
      const serializedUser = {
        ...user,
        telegramId: user.telegramId.toString(),
        channels: user.channels.map((channel) => ({
          ...channel,
          telegramId: undefined,
        })),
      };

      return res.status(200).json({ success: true, data: serializedUser });
    } catch (error) {
      console.error("User fetch error:", error);
      return res.status(500).json({ success: false, error: "Failed to fetch user" });
    }
  }

  if (req.method === "PATCH") {
    try {
      const { isActive } = req.body;

      if (typeof isActive !== "boolean") {
        return res.status(400).json({ success: false, error: "isActive must be a boolean" });
      }

      const user = await prisma.user.update({
        where: { id },
        data: { isActive },
      });

      return res.status(200).json({
        success: true,
        data: {
          ...user,
          telegramId: user.telegramId.toString(),
        },
      });
    } catch (error) {
      console.error("User update error:", error);
      return res.status(500).json({ success: false, error: "Failed to update user" });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withAdminAuth(handler);
