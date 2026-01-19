import type { NextApiResponse } from "next";
import { withAdminAuth, type AuthenticatedRequest } from "~/lib/auth";

// Store pending auth sessions in memory (in production, use Redis)
const pendingAuths = new Map<
  string,
  {
    phoneCodeHash: string;
    phone: string;
    client: unknown;
    createdAt: number;
  }
>();

// Clean up expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of pendingAuths.entries()) {
    if (now - value.createdAt > 10 * 60 * 1000) {
      // 10 minutes
      pendingAuths.delete(key);
    }
  }
}, 60 * 1000);

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, error: "Phone number is required" });
  }

  // Validate phone format (basic check)
  const cleanPhone = phone.replace(/[^0-9+]/g, "");
  if (!cleanPhone.startsWith("+") || cleanPhone.length < 10) {
    return res.status(400).json({
      success: false,
      error: "Phone must be in international format (e.g., +1234567890)",
    });
  }

  try {
    const { createMTProtoClient, StringSession } = await import("@repo/telegram-mtproto");

    const apiId = process.env.TELEGRAM_API_ID;
    const apiHash = process.env.TELEGRAM_API_HASH;

    if (!apiId || !apiHash) {
      return res.status(500).json({
        success: false,
        error: "TELEGRAM_API_ID and TELEGRAM_API_HASH must be configured",
      });
    }

    const client = await createMTProtoClient({
      apiId: parseInt(apiId, 10),
      apiHash,
      sessionString: "",
    });

    // Send authentication code
    const result = await client.sendCode(
      {
        apiId: parseInt(apiId, 10),
        apiHash,
      },
      cleanPhone
    );

    // Generate a unique auth session ID
    const authSessionId = `auth_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Store the pending auth
    pendingAuths.set(authSessionId, {
      phoneCodeHash: result.phoneCodeHash,
      phone: cleanPhone,
      client,
      createdAt: Date.now(),
    });

    return res.status(200).json({
      success: true,
      data: {
        authSessionId,
        phoneCodeHash: result.phoneCodeHash,
      },
    });
  } catch (error) {
    console.error("Send code error:", error);
    const message = error instanceof Error ? error.message : "Failed to send code";
    return res.status(400).json({ success: false, error: message });
  }
}

export default withAdminAuth(handler);

// Export for use in verify-code endpoint
export { pendingAuths };
