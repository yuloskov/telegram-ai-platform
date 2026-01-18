import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";
import { verifyBotPermissions, getChannelInfo } from "@repo/telegram-bot";

interface VerifyResponse {
  valid: boolean;
  canPost: boolean;
  canEditMessages: boolean;
  canDeleteMessages: boolean;
  channelInfo?: {
    id: number;
    title: string;
    username?: string;
  };
  error?: string;
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<VerifyResponse>>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { channelId } = req.body;

  if (!channelId) {
    return res.status(400).json({
      success: false,
      error: "Channel ID or username is required",
    });
  }

  try {
    // Get channel info
    const channelInfo = await getChannelInfo(channelId);

    if (!channelInfo) {
      return res.status(200).json({
        success: true,
        data: {
          valid: false,
          canPost: false,
          canEditMessages: false,
          canDeleteMessages: false,
          error: "Channel not found or not accessible",
        },
      });
    }

    // Verify bot permissions
    const permissions = await verifyBotPermissions(channelId);

    return res.status(200).json({
      success: true,
      data: {
        valid: true,
        canPost: permissions.canPost,
        canEditMessages: permissions.canEditMessages,
        canDeleteMessages: permissions.canDeleteMessages,
        channelInfo,
        error: permissions.error,
      },
    });
  } catch (error) {
    return res.status(200).json({
      success: true,
      data: {
        valid: false,
        canPost: false,
        canEditMessages: false,
        canDeleteMessages: false,
        error: error instanceof Error ? error.message : "Failed to verify channel",
      },
    });
  }
}

export default withAuth(handler);
