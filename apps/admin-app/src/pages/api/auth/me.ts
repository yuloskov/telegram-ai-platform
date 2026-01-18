import type { NextApiResponse } from "next";
import { withAdminAuth, type AuthenticatedRequest } from "~/lib/auth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  return res.status(200).json({
    success: true,
    data: {
      username: "admin",
      type: req.admin.type,
    },
  });
}

export default withAdminAuth(handler);
