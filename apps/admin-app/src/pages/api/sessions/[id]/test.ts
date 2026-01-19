import type { NextApiResponse } from "next";
import { prisma } from "@repo/database";
import { withAdminAuth, type AuthenticatedRequest } from "~/lib/auth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ success: false, error: "Invalid session ID" });
  }

  try {
    const session = await prisma.telegramSession.findUnique({
      where: { id },
    });

    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    // Dynamically import to avoid issues if package not installed
    const { getMTProtoClient, disconnectClient } = await import("@repo/telegram-mtproto");

    const client = await getMTProtoClient(session.sessionString);

    // Try to get current user info to verify session works
    const me = await client.getMe();

    await disconnectClient(client);

    // Update lastUsedAt
    await prisma.telegramSession.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });

    return res.status(200).json({
      success: true,
      data: {
        connected: true,
        user: {
          id: String(me.id),
          firstName: me.firstName,
          lastName: me.lastName,
          username: me.username,
          phone: me.phone,
        },
      },
    });
  } catch (error) {
    console.error("Session test error:", error);
    const message = error instanceof Error ? error.message : "Connection failed";
    return res.status(200).json({
      success: true,
      data: {
        connected: false,
        error: message,
      },
    });
  }
}

export default withAdminAuth(handler);
