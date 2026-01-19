import type { NextApiResponse } from "next";
import { prisma } from "@repo/database";
import { withAdminAuth, type AuthenticatedRequest } from "~/lib/auth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ success: false, error: "Invalid session ID" });
  }

  if (req.method === "GET") {
    return handleGet(id, res);
  } else if (req.method === "PATCH") {
    return handlePatch(id, req, res);
  } else if (req.method === "DELETE") {
    return handleDelete(id, res);
  }
  return res.status(405).json({ success: false, error: "Method not allowed" });
}

async function handleGet(id: string, res: NextApiResponse) {
  try {
    const session = await prisma.telegramSession.findUnique({
      where: { id },
      select: {
        id: true,
        phone: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    return res.status(200).json({ success: true, data: session });
  } catch (error) {
    console.error("Session fetch error:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch session" });
  }
}

async function handlePatch(id: string, req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { isActive } = req.body;

    const session = await prisma.telegramSession.findUnique({
      where: { id },
    });

    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    const updated = await prisma.telegramSession.update({
      where: { id },
      data: {
        ...(typeof isActive === "boolean" && { isActive }),
      },
      select: {
        id: true,
        phone: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Session update error:", error);
    return res.status(500).json({ success: false, error: "Failed to update session" });
  }
}

async function handleDelete(id: string, res: NextApiResponse) {
  try {
    const session = await prisma.telegramSession.findUnique({
      where: { id },
    });

    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    await prisma.telegramSession.delete({
      where: { id },
    });

    return res.status(200).json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("Session delete error:", error);
    return res.status(500).json({ success: false, error: "Failed to delete session" });
  }
}

export default withAdminAuth(handler);
