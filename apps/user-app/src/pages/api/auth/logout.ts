import type { NextApiRequest, NextApiResponse } from "next";
import type { ApiResponse } from "@repo/shared/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Clear the auth cookie
  res.setHeader(
    "Set-Cookie",
    `auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
}
