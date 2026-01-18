import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { signJWT } from "@repo/shared/auth";
import type { ApiResponse } from "@repo/shared/types";

interface VerifyResponse {
  authenticated: boolean;
  token?: string;
  user?: {
    id: string;
    telegramId: string;
    username: string | null;
    displayName: string | null;
    language: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<VerifyResponse>>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { code } = req.body;

  if (!code || typeof code !== "string") {
    return res.status(400).json({
      success: false,
      error: "Code is required",
    });
  }

  try {
    // Look up the auth code
    const authCode = await prisma.authCode.findUnique({
      where: { code: code.toUpperCase() },
      include: { user: true },
    });

    if (!authCode) {
      return res.status(200).json({
        success: true,
        data: { authenticated: false },
      });
    }

    // Check if code has been used and linked to a user
    if (!authCode.used || !authCode.user) {
      return res.status(200).json({
        success: true,
        data: { authenticated: false },
      });
    }

    // Check if code is expired
    if (new Date() > authCode.expiresAt) {
      return res.status(200).json({
        success: true,
        data: { authenticated: false },
      });
    }

    // Generate JWT
    const token = await signJWT({
      sub: authCode.user.id,
      telegramId: authCode.user.telegramId.toString(),
      type: "user",
    });

    // Set httpOnly cookie
    res.setHeader(
      "Set-Cookie",
      `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`
    );

    return res.status(200).json({
      success: true,
      data: {
        authenticated: true,
        token,
        user: {
          id: authCode.user.id,
          telegramId: authCode.user.telegramId.toString(),
          username: authCode.user.username,
          displayName: authCode.user.displayName,
          language: authCode.user.language,
        },
      },
    });
  } catch (error) {
    console.error("Error verifying auth code:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to verify authentication code",
    });
  }
}
