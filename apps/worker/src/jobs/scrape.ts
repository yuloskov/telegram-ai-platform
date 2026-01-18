import { prisma } from "@repo/database";
import { getMTProtoClient, scrapeChannelMessages, disconnectClient } from "@repo/telegram-mtproto";
import type { ScrapingJobPayload } from "@repo/shared/queues";

export async function handleScrapeJob(data: ScrapingJobPayload): Promise<void> {
  const { sourceId, sessionId } = data;

  // Get the content source
  const source = await prisma.contentSource.findUnique({
    where: { id: sourceId },
    include: {
      channel: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!source) {
    throw new Error(`Content source not found: ${sourceId}`);
  }

  // Get a session to use for scraping
  let session;
  if (sessionId) {
    session = await prisma.telegramSession.findUnique({
      where: { id: sessionId },
    });
  } else {
    // Get any active session
    session = await prisma.telegramSession.findFirst({
      where: { isActive: true },
    });
  }

  if (!session) {
    throw new Error("No active Telegram session available for scraping");
  }

  // Connect to Telegram
  const client = await getMTProtoClient(session.sessionString);

  try {
    // Get the last scraped message ID to only fetch new messages
    const lastScraped = await prisma.scrapedContent.findFirst({
      where: { sourceId },
      orderBy: { telegramMessageId: "desc" },
    });

    const minId = lastScraped ? Number(lastScraped.telegramMessageId) : undefined;

    // Scrape messages
    const messages = await scrapeChannelMessages(
      client,
      source.telegramUsername,
      50,
      minId
    );

    console.log(`Scraped ${messages.length} messages from ${source.telegramUsername}`);

    // Save scraped content
    let newCount = 0;
    for (const message of messages) {
      try {
        await prisma.scrapedContent.create({
          data: {
            sourceId,
            telegramMessageId: BigInt(message.id),
            text: message.text,
            mediaUrls: message.mediaUrls,
            views: message.views,
            forwards: message.forwards,
            scrapedAt: new Date(),
          },
        });
        newCount++;
      } catch (error) {
        // Skip duplicate messages
        if ((error as { code?: string }).code === "P2002") {
          continue;
        }
        throw error;
      }
    }

    // Update last scraped time
    await prisma.contentSource.update({
      where: { id: sourceId },
      data: { lastScrapedAt: new Date() },
    });

    // Update session last used time
    await prisma.telegramSession.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });

    console.log(`Saved ${newCount} new messages from ${source.telegramUsername}`);
  } finally {
    await disconnectClient(client);
  }
}
