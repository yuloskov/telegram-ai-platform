import type { NextApiRequest, NextApiResponse } from "next";
import { verifyJWT } from "@repo/shared";
import type { JWTPayload } from "@repo/shared";

// Hardcoded admin credentials
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

export function validateAdminCredentials(username: string, password: string): boolean {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

export interface AuthenticatedRequest extends NextApiRequest {
  admin: JWTPayload;
}

type ApiHandler<T = unknown> = (
  req: AuthenticatedRequest,
  res: NextApiResponse<T>
) => Promise<void> | void;

export function withAdminAuth<T>(handler: ApiHandler<T>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const token = req.cookies.admin_token;

    if (!token) {
      return res.status(401).json({ success: false, error: "Unauthorized - No token provided" });
    }

    const payload = await verifyJWT(token);

    if (!payload) {
      return res.status(401).json({ success: false, error: "Unauthorized - Invalid token" });
    }

    if (payload.type !== "admin") {
      return res.status(403).json({ success: false, error: "Forbidden - Admin access required" });
    }

    (req as AuthenticatedRequest).admin = payload;
    return handler(req as AuthenticatedRequest, res);
  };
}
