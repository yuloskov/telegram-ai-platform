import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { verifyJWT } from "@repo/shared/auth";
import type { ApiResponse } from "@repo/shared/types";

const SUPPORTED_LANGUAGES = ["en", "ru"] as const;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<{ language: string }>>
) {
  if (req.method !== "PUT") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

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

    const { language } = req.body;

    if (!language || !SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({
        success: false,
        error: "Invalid language. Supported: en, ru",
      });
    }

    await prisma.user.update({
      where: { id: payload.sub },
      data: { language },
    });

    return res.status(200).json({
      success: true,
      data: { language },
    });
  } catch (error) {
    console.error("Error updating language:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update language",
    });
  }
}
