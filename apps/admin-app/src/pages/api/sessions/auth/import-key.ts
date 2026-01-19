import type { NextApiResponse } from "next";
import { prisma } from "@repo/database";
import { withAdminAuth, type AuthenticatedRequest } from "~/lib/auth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { authKey, dcId } = req.body;

  if (!authKey) {
    return res.status(400).json({ success: false, error: "Auth key is required" });
  }

  const dcIdNum = parseInt(dcId, 10);
  if (isNaN(dcIdNum) || dcIdNum < 1 || dcIdNum > 5) {
    return res.status(400).json({
      success: false,
      error: "DC ID must be a number between 1 and 5",
    });
  }

  try {
    const { createSessionFromAuthKey } = await import("@repo/telegram-mtproto");

    const result = await createSessionFromAuthKey({
      authKey,
      dcId: dcIdNum,
    });

    // Check if phone already exists
    const existing = await prisma.telegramSession.findUnique({
      where: { phone: result.phone },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: `A session with phone ${result.phone} already exists`,
      });
    }

    // Save the session
    const session = await prisma.telegramSession.create({
      data: {
        phone: result.phone,
        sessionString: result.sessionString,
        isActive: true,
      },
      select: {
        id: true,
        phone: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        ...session,
        userId: result.userId,
      },
    });
  } catch (error) {
    console.error("Auth key import error:", error);
    const message = error instanceof Error ? error.message : "Failed to import auth key";
    return res.status(400).json({ success: false, error: message });
  }
}

export default withAdminAuth(handler);
