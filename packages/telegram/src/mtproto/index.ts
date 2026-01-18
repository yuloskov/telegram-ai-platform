import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

export interface MTProtoConfig {
  apiId: number;
  apiHash: string;
  sessionString?: string;
}

let clientInstance: TelegramClient | null = null;

export async function createMTProtoClient(
  config: MTProtoConfig
): Promise<TelegramClient> {
  const session = new StringSession(config.sessionString ?? "");

  const client = new TelegramClient(session, config.apiId, config.apiHash, {
    connectionRetries: 5,
  });

  await client.connect();
  return client;
}

export async function getMTProtoClient(
  sessionString: string
): Promise<TelegramClient> {
  const apiId = process.env.TELEGRAM_API_ID;
  const apiHash = process.env.TELEGRAM_API_HASH;

  if (!apiId || !apiHash) {
    throw new Error("TELEGRAM_API_ID and TELEGRAM_API_HASH must be set");
  }

  return createMTProtoClient({
    apiId: parseInt(apiId, 10),
    apiHash,
    sessionString,
  });
}

export async function scrapeChannelMessages(
  client: TelegramClient,
  channelUsername: string,
  limit = 50,
  minId?: number
): Promise<
  Array<{
    id: number;
    text: string | null;
    date: Date;
    views: number;
    forwards: number;
    mediaUrls: string[];
  }>
> {
  const entity = await client.getEntity(channelUsername);

  const messages = await client.getMessages(entity, {
    limit,
    minId,
  });

  const results = [];

  for (const message of messages) {
    if (!message.message && !message.media) continue;

    const mediaUrls: string[] = [];

    if (message.media) {
      try {
        const buffer = await client.downloadMedia(message.media, {});
        if (buffer) {
          // In production, upload to MinIO and get URL
          // For now, we'll handle this in the worker
          mediaUrls.push(`pending:${message.id}`);
        }
      } catch {
        // Media download failed, skip
      }
    }

    results.push({
      id: message.id,
      text: message.message ?? null,
      date: new Date(message.date * 1000),
      views: message.views ?? 0,
      forwards: message.forwards ?? 0,
      mediaUrls,
    });
  }

  return results;
}

export async function getChannelEntity(
  client: TelegramClient,
  channelUsername: string
): Promise<{ id: string; title: string; username: string | undefined } | null> {
  try {
    const entity = await client.getEntity(channelUsername);
    return {
      id: String(entity.id),
      title: "title" in entity ? (entity.title as string) : channelUsername,
      username: "username" in entity ? (entity.username as string | undefined) : channelUsername,
    };
  } catch {
    return null;
  }
}

export async function disconnectClient(client: TelegramClient): Promise<void> {
  await client.disconnect();
}

export { TelegramClient, StringSession };
