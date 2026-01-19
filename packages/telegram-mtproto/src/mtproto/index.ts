import { TelegramClient, Api } from "telegram";
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

async function resolveUsername(client: TelegramClient, username: string) {
  // Remove @ prefix if present
  const cleanUsername = username.startsWith("@") ? username.slice(1) : username;

  const result = await client.invoke(
    new Api.contacts.ResolveUsername({ username: cleanUsername })
  );

  const channel = result.chats?.[0];
  if (!channel) {
    throw new Error(`Channel not found: ${username}`);
  }

  return channel;
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
  const channel = await resolveUsername(client, channelUsername);
  const entity = await client.getEntity(channel);

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
    const channel = await resolveUsername(client, channelUsername);
    return {
      id: String(channel.id),
      title: "title" in channel ? (channel.title as string) : channelUsername,
      username: "username" in channel ? (channel.username as string | undefined) : channelUsername,
    };
  } catch {
    return null;
  }
}

export async function disconnectClient(client: TelegramClient): Promise<void> {
  await client.disconnect();
}

export interface AuthKeyImportParams {
  authKey: string; // hex encoded auth key (512 hex chars = 256 bytes)
  dcId: number; // 1-5
}

// DC IP addresses (must match Telethon/Pyrogram format)
const DC_ADDRESSES: Record<number, string> = {
  1: "149.154.175.53",
  2: "149.154.167.51",
  3: "149.154.175.100",
  4: "149.154.167.91",
  5: "91.108.56.130",
};

function ipToBytes(ip: string): Buffer {
  const parts = ip.split(".").map(Number);
  return Buffer.from(parts);
}

function buildSessionString(authKeyHex: string, dcId: number): string {
  const ip = DC_ADDRESSES[dcId];
  if (!ip) {
    throw new Error(`Invalid DC ID: ${dcId}. Must be 1-5.`);
  }

  // Normalize: remove spaces, newlines, and validate hex
  const cleanedHex = authKeyHex.replace(/[\s\n\r]/g, "").toLowerCase();

  if (!/^[0-9a-f]+$/.test(cleanedHex)) {
    throw new Error("Auth key must be a valid hex string");
  }

  if (cleanedHex.length !== 512) {
    throw new Error(`Invalid auth key length: ${cleanedHex.length / 2} bytes. Expected 256 bytes (512 hex characters).`);
  }

  const authKey = Buffer.from(cleanedHex, "hex");
  const port = 443;

  // Telethon session format (also supported by GramJS):
  // - Prefix: "1" (version character)
  // - URL-safe Base64: dcId(1) + ip(4, packed IPv4) + port(2, uint16BE) + authKey(256)
  // Total payload: 1 + 4 + 2 + 256 = 263 bytes -> 352 base64 chars
  const ipBytes = ipToBytes(ip);
  const buffer = Buffer.alloc(1 + 4 + 2 + 256);

  let offset = 0;
  buffer.writeUInt8(dcId, offset++);                  // DC ID (1 byte)
  ipBytes.copy(buffer, offset);                       // IP address (4 bytes, packed)
  offset += 4;
  buffer.writeUInt16BE(port, offset);                 // port (2 bytes, uint16BE)
  offset += 2;
  authKey.copy(buffer, offset);                       // auth key (256 bytes)

  // Version "1" prefix + URL-safe base64 encoded payload (with padding)
  // Use standard base64 and convert to URL-safe to preserve padding
  const base64 = buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
  return "1" + base64;
}

export async function createSessionFromAuthKey(
  params: AuthKeyImportParams
): Promise<{ sessionString: string; phone: string; userId: string }> {
  const apiId = process.env.TELEGRAM_API_ID;
  const apiHash = process.env.TELEGRAM_API_HASH;

  if (!apiId || !apiHash) {
    throw new Error("TELEGRAM_API_ID and TELEGRAM_API_HASH must be set");
  }

  // Build session string from hex auth key
  const sessionString = buildSessionString(params.authKey, params.dcId);

  const session = new StringSession(sessionString);
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

  // Get the final session string (may be updated after connection)
  const finalSessionString = client.session.save() as unknown as string;
  const phone = me.phone ?? `user_${me.id}`;
  const userId = String(me.id);

  await client.disconnect();

  return { sessionString: finalSessionString, phone, userId };
}

export { TelegramClient, StringSession };
