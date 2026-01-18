import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { verifyJWT } from "@repo/shared/auth";
import type { ApiResponse } from "@repo/shared/types";

interface MeResponse {
  id: string;
  telegramId: string;
  username: string | null;
  displayName: string | null;
  language: string;
  isActive: boolean;
  createdAt: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<MeResponse>>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Get token from cookie or Authorization header
  const token =
    req.cookies.auth_token ||
    req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Not authenticated",
    });
  }

  try {
    const payload = await verifyJWT(token);

    if (!payload || payload.type !== "user") {
      return res.status(401).json({
        success: false,
        error: "Invalid token",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: "Account is deactivated",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        telegramId: user.telegramId.toString(),
        username: user.username,
        displayName: user.displayName,
        language: user.language,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error getting user:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get user",
    });
  }
}
