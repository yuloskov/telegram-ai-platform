import type { NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";
import { CreateChannelSchema } from "@repo/shared/types";
import { verifyBotPermissions, getChannelInfo } from "@repo/telegram-bot/bot";

interface ChannelResponse {
  id: string;
  telegramId: string;
  username: string | null;
  title: string;
  niche: string | null;
  tone: string;
  language: string;
  hashtags: string[];
  isActive: boolean;
  createdAt: string;
  _count?: {
    posts: number;
    contentSources: number;
  };
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<ChannelResponse | ChannelResponse[]>>
) {
  const { user } = req;

  if (req.method === "GET") {
    // List all channels for the user
    const channels = await prisma.channel.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            posts: true,
            contentSources: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      data: channels.map((channel) => ({
        id: channel.id,
        telegramId: channel.telegramId.toString(),
        username: channel.username,
        title: channel.title,
        niche: channel.niche,
        tone: channel.tone,
        language: channel.language,
        hashtags: channel.hashtags,
        isActive: channel.isActive,
        createdAt: channel.createdAt.toISOString(),
        _count: channel._count,
      })),
    });
  }

  if (req.method === "POST") {
    // Create a new channel
    const parseResult = CreateChannelSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.errors.map((e) => e.message).join(", "),
      });
    }

    const { telegramId, title, niche, tone, language, hashtags } = parseResult.data;

    // Check if channel already exists for this user
    const existingChannel = await prisma.channel.findFirst({
      where: {
        telegramId: BigInt(telegramId.toString()),
        userId: user.id,
      },
    });

    if (existingChannel) {
      return res.status(400).json({
        success: false,
        error: "This channel is already added to your account",
      });
    }

    // Verify bot has permissions in the channel
    const permissions = await verifyBotPermissions(telegramId.toString());

    if (!permissions.canPost) {
      return res.status(400).json({
        success: false,
        error: permissions.error || "Bot does not have posting permissions in this channel",
      });
    }

    // Get channel info from Telegram
    const channelInfo = await getChannelInfo(telegramId.toString());

    // Create the channel
    const channel = await prisma.channel.create({
      data: {
        userId: user.id,
        telegramId: BigInt(telegramId.toString()),
        username: channelInfo?.username,
        title: channelInfo?.title || title,
        niche,
        tone,
        language,
        hashtags,
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        id: channel.id,
        telegramId: channel.telegramId.toString(),
        username: channel.username,
        title: channel.title,
        niche: channel.niche,
        tone: channel.tone,
        language: channel.language,
        hashtags: channel.hashtags,
        isActive: channel.isActive,
        createdAt: channel.createdAt.toISOString(),
      },
    });
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withAuth(handler);
