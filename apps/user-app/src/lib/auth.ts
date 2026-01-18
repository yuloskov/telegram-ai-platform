import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { verifyJWT } from "@repo/shared/auth";
import type { User } from "@repo/database";

export interface AuthenticatedRequest extends NextApiRequest {
  user: User;
}

export type AuthenticatedHandler<T = unknown> = (
  req: AuthenticatedRequest,
  res: NextApiResponse<T>
) => Promise<void | NextApiResponse<T>>;

export function withAuth<T>(handler: AuthenticatedHandler<T>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
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
        return res.status(401).json({
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

      // Attach user to request
      (req as AuthenticatedRequest).user = user;

      return handler(req as AuthenticatedRequest, res);
    } catch (error) {
      console.error("Auth error:", error);
      return res.status(401).json({
        success: false,
        error: "Authentication failed",
      });
    }
  };
}
