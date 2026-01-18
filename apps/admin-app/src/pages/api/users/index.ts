import type { NextApiResponse } from "next";
import { prisma } from "@repo/database";
import { withAdminAuth, type AuthenticatedRequest } from "~/lib/auth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || "";
    const status = req.query.status as string;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: "insensitive" } },
        { displayName: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status === "active") {
      where.isActive = true;
    } else if (status === "inactive") {
      where.isActive = false;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              channels: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Serialize BigInt to string
    const serializedUsers = users.map((user) => ({
      ...user,
      telegramId: user.telegramId.toString(),
    }));

    return res.status(200).json({
      success: true,
      data: serializedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Users fetch error:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
}

export default withAdminAuth(handler);
