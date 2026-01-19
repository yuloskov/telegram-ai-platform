import type { NextApiResponse } from "next";
import { prisma } from "@repo/database";
import { withAdminAuth, type AuthenticatedRequest } from "~/lib/auth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    return handleGet(req, res);
  } else if (req.method === "POST") {
    return handlePost(req, res);
  }
  return res.status(405).json({ success: false, error: "Method not allowed" });
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (status === "active") {
      where.isActive = true;
    } else if (status === "inactive") {
      where.isActive = false;
    }

    const [sessions, total] = await Promise.all([
      prisma.telegramSession.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          phone: true,
          isActive: true,
          lastUsedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.telegramSession.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Sessions fetch error:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch sessions" });
  }
}

async function handlePost(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { phone, sessionString: rawSessionString } = req.body;

    // Strip whitespace from session string (users often copy with line breaks)
    const sessionString = rawSessionString?.replace(/\s/g, "");

    if (!phone || !sessionString) {
      return res.status(400).json({
        success: false,
        error: "Phone and sessionString are required",
      });
    }

    // Check if phone already exists
    const existing = await prisma.telegramSession.findUnique({
      where: { phone },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: "A session with this phone number already exists",
      });
    }

    const session = await prisma.telegramSession.create({
      data: {
        phone,
        sessionString,
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

    return res.status(201).json({ success: true, data: session });
  } catch (error) {
    console.error("Session creation error:", error);
    return res.status(500).json({ success: false, error: "Failed to create session" });
  }
}

export default withAdminAuth(handler);
