import type { NextApiResponse } from "next";
import { prisma } from "@repo/database";
import { withAdminAuth, type AuthenticatedRequest } from "~/lib/auth";
import { pendingAuths } from "./send-code";
import type { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { authSessionId, code, password } = req.body;

  if (!authSessionId || !code) {
    return res.status(400).json({
      success: false,
      error: "Auth session ID and code are required",
    });
  }

  const pendingAuth = pendingAuths.get(authSessionId);

  if (!pendingAuth) {
    return res.status(400).json({
      success: false,
      error: "Auth session expired or not found. Please start over.",
    });
  }

  try {
    const client = pendingAuth.client as TelegramClient;
    const { Api } = await import("telegram/tl");

    try {
      // Try to sign in with the code
      await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: pendingAuth.phone,
          phoneCodeHash: pendingAuth.phoneCodeHash,
          phoneCode: code,
        })
      );
    } catch (signInError: unknown) {
      // Check if 2FA is required
      const error = signInError as { errorMessage?: string };
      if (error.errorMessage === "SESSION_PASSWORD_NEEDED") {
        if (!password) {
          return res.status(200).json({
            success: true,
            data: {
              requiresPassword: true,
              authSessionId,
            },
          });
        }

        // Try with password
        const passwordResult = await client.invoke(new Api.account.GetPassword());

        const { computeCheck } = await import("telegram/Password");
        const passwordCheck = await computeCheck(passwordResult, password);

        await client.invoke(
          new Api.auth.CheckPassword({
            password: passwordCheck,
          })
        );
      } else {
        throw signInError;
      }
    }

    // Get the session string
    const stringSession = client.session as StringSession;
    const sessionString = stringSession.save();

    // Save to database
    const session = await prisma.telegramSession.create({
      data: {
        phone: pendingAuth.phone,
        sessionString,
        isActive: true,
      },
      select: {
        id: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Clean up
    await client.disconnect();
    pendingAuths.delete(authSessionId);

    return res.status(200).json({
      success: true,
      data: {
        session,
        completed: true,
      },
    });
  } catch (error) {
    console.error("Verify code error:", error);
    const message = error instanceof Error ? error.message : "Failed to verify code";
    return res.status(400).json({ success: false, error: message });
  }
}

export default withAdminAuth(handler);
