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

export interface AuthKeyImportParams {
  authKey: string; // base64 encoded auth key
  dcId: number; // 1-5
}

const DC_ADDRESSES: Record<number, { ip: string; port: number }> = {
  1: { ip: "149.154.175.53", port: 443 },
  2: { ip: "149.154.167.50", port: 443 },
  3: { ip: "149.154.175.100", port: 443 },
  4: { ip: "149.154.167.92", port: 443 },
  5: { ip: "91.108.56.128", port: 443 },
};

export async function createSessionFromAuthKey(
  params: AuthKeyImportParams
): Promise<{ sessionString: string; phone: string; userId: string }> {
  const apiId = process.env.TELEGRAM_API_ID;
  const apiHash = process.env.TELEGRAM_API_HASH;

  if (!apiId || !apiHash) {
    throw new Error("TELEGRAM_API_ID and TELEGRAM_API_HASH must be set");
  }

  const dcInfo = DC_ADDRESSES[params.dcId];
  if (!dcInfo) {
    throw new Error(`Invalid DC ID: ${params.dcId}. Must be 1-5.`);
  }

  // Create session and set auth key
  const session = new StringSession("");
  const authKeyBuffer = Buffer.from(params.authKey, "base64");

  if (authKeyBuffer.length !== 256) {
    throw new Error(`Invalid auth key length: ${authKeyBuffer.length}. Expected 256 bytes.`);
  }

  session.setDC(params.dcId, dcInfo.ip, dcInfo.port);
  // @ts-expect-error - setAuthKey exists but types are incomplete
  session.setAuthKey(authKeyBuffer, params.dcId);

  const client = new TelegramClient(session, parseInt(apiId, 10), apiHash, {
    connectionRetries: 5,
  });

  await client.connect();

  // Verify the session works by getting user info
  const me = await client.getMe();
  if (!me) {
    await client.disconnect();
    throw new Error("Failed to authenticate with provided auth key");
  }

  const sessionString = client.session.save() as unknown as string;
  const phone = me.phone ?? `user_${me.id}`;
  const userId = String(me.id);

  await client.disconnect();

  return { sessionString, phone, userId };
}

export { TelegramClient, StringSession };
