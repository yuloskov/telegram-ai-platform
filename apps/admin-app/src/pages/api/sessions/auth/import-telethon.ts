import type { NextApiResponse } from "next";
import { prisma } from "@repo/database";
import { withAdminAuth, type AuthenticatedRequest } from "~/lib/auth";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomBytes } from "crypto";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { fileContent } = req.body;

  if (!fileContent) {
    return res.status(400).json({ success: false, error: "File content is required" });
  }

  // Decode base64 file content
  const buffer = Buffer.from(fileContent, "base64");

  // Write to temp file
  const tempPath = join(tmpdir(), `telethon_${randomBytes(8).toString("hex")}.session`);

  try {
    await writeFile(tempPath, buffer);

    // Extract auth key using sqlite3
    const { stdout } = await execAsync(
      `sqlite3 "${tempPath}" "SELECT dc_id, hex(auth_key) FROM sessions WHERE auth_key IS NOT NULL LIMIT 1"`
    );

    const parts = stdout.trim().split("|");
    if (parts.length !== 2) {
      return res.status(400).json({
        success: false,
        error: "Invalid Telethon session file - no valid session found",
      });
    }

    const dcId = parseInt(parts[0] ?? "0", 10);
    const authKey = parts[1] ?? "";

    if (isNaN(dcId) || dcId < 1 || dcId > 5) {
      return res.status(400).json({
        success: false,
        error: `Invalid DC ID: ${dcId}`,
      });
    }

    if (!authKey || authKey.length !== 512) {
      return res.status(400).json({
        success: false,
        error: `Invalid auth key length: ${authKey?.length || 0}. Expected 512 hex characters.`,
      });
    }

    // Import the session
    const { createSessionFromAuthKey } = await import("@repo/telegram-mtproto");

    const result = await createSessionFromAuthKey({
      authKey,
      dcId,
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
    console.error("Telethon import error:", error);
    const message = error instanceof Error ? error.message : "Failed to import Telethon session";
    return res.status(400).json({ success: false, error: message });
  } finally {
    // Clean up temp file
    try {
      await unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

export default withAdminAuth(handler);
