import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { createAuthCode, getAuthCodeExpiry } from "@repo/shared/auth";
import type { ApiResponse } from "@repo/shared/types";

interface CodeResponse {
  code: string;
  expiresAt: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<CodeResponse>>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    // Generate a new auth code
    const code = createAuthCode();
    const expiresAt = getAuthCodeExpiry();

    // Save to database
    await prisma.authCode.create({
      data: {
        code,
        expiresAt,
        used: false,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        code,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error generating auth code:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate authentication code",
    });
  }
}
