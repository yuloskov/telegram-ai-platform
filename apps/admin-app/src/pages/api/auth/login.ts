import type { NextApiRequest, NextApiResponse } from "next";
import { signJWT } from "@repo/shared";
import { validateAdminCredentials } from "~/lib/auth";

interface LoginRequest {
  username: string;
  password: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { username, password } = req.body as LoginRequest;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: "Username and password required" });
  }

  if (!validateAdminCredentials(username, password)) {
    return res.status(401).json({ success: false, error: "Invalid credentials" });
  }

  // Create JWT token with admin type
  const token = await signJWT({
    sub: "admin",
    telegramId: "0",
    type: "admin",
  });

  // Set HTTP-only cookie
  res.setHeader(
    "Set-Cookie",
    `admin_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${24 * 60 * 60}`
  );

  return res.status(200).json({
    success: true,
    data: {
      username: "admin",
    },
  });
}
