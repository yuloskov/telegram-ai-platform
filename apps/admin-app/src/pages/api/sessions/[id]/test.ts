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

    // Validate session format (strip any whitespace that may have been accidentally included)
    const sessionString = session.sessionString.replace(/\s/g, "");

    // GramJS/Telethon session strings start with "1" followed by base64 data
    // Minimum valid session: 1 + base64(dcId + ip + port + authKey) = 1 + ~350 chars
    if (!sessionString || sessionString.length < 100 || !sessionString.startsWith("1")) {
      throw new Error("Invalid session string format");
    }

    // Try to decode the base64 portion to validate
    try {
      const base64Part = sessionString.slice(1);
      const decoded = Buffer.from(base64Part, "base64");

      // Valid session should have at least: dcId(1) + ip(4) + port(2) + authKey(256) = 263 bytes
      if (decoded.length < 263) {
        throw new Error(`Session too short: ${decoded.length} bytes, expected at least 263`);
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("Session too short")) {
        throw e;
      }
      throw new Error("Invalid base64 encoding in session string");
    }

    // Session format is valid - update lastUsedAt
    await prisma.telegramSession.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });

    return res.status(200).json({
      success: true,
      data: {
        connected: true,
        user: {
          id: "N/A",
          firstName: "Session Valid",
          lastName: "(format validated)",
          username: null,
          phone: session.phone,
        },
        note: "Session format validated. Full connection test happens during scraping.",
      },
    });
  } catch (error) {
    console.error("Session test error:", error);
    const message = error instanceof Error ? error.message : "Invalid session";
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
