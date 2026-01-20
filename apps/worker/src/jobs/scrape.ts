import { prisma } from "@repo/database";
import { getMTProtoClient, scrapeChannelMessages, disconnectClient } from "@repo/telegram-mtproto";
import type { ScrapingJobPayload } from "@repo/shared/queues";

const BATCH_SIZE = 10; // Max posts per Telegram API request

export async function handleScrapeJob(data: ScrapingJobPayload): Promise<void> {
  const { sourceId, sessionId } = data;

  // Create scrape log entry
  const scrapeLog = await prisma.scrapeLog.create({
    data: {
      sourceId,
      status: "running",
      startedAt: new Date(),
    },
  });

  // Get the content source with maxScrapePosts setting
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
    await prisma.scrapeLog.update({
      where: { id: scrapeLog.id },
      data: { status: "failed", error: "Content source not found", completedAt: new Date() },
    });
    throw new Error(`Content source not found: ${sourceId}`);
  }

  // Get a session to use for scraping
  let session;
  if (sessionId) {
    session = await prisma.telegramSession.findUnique({
      where: { id: sessionId },
    });
  } else {
    session = await prisma.telegramSession.findFirst({
      where: { isActive: true },
    });
  }

  if (!session) {
    await prisma.scrapeLog.update({
      where: { id: scrapeLog.id },
      data: { status: "failed", error: "No active Telegram session available", completedAt: new Date() },
    });
    throw new Error("No active Telegram session available for scraping");
  }

  // Connect to Telegram
  const client = await getMTProtoClient(session.sessionString);

  try {
    // Get existing message IDs for duplicate detection (single query)
    const existingPosts = await prisma.scrapedContent.findMany({
      where: { sourceId },
      select: { telegramMessageId: true },
      orderBy: { telegramMessageId: "desc" },
      take: 100, // Get last 100 for efficient matching
    });
    const existingIds = new Set(existingPosts.map((p) => p.telegramMessageId.toString()));

    const maxPosts = Math.min(Math.max(source.maxScrapePosts, 1), 50); // Clamp to 1-50
    let totalFound = 0;
    let newCount = 0;
    let offsetId: number | undefined = undefined;
    let foundDuplicate = false;

    // Scrape in batches until we reach maxPosts or find a duplicate
    while (totalFound < maxPosts && !foundDuplicate) {
      const batchSize = Math.min(BATCH_SIZE, maxPosts - totalFound);

      const messages = await scrapeChannelMessages(
        client,
        source.telegramUsername,
        batchSize,
        undefined, // Don't use minId - we want to detect duplicates
        offsetId
      );

      if (messages.length === 0) break;

      console.log(`Scraped batch of ${messages.length} messages from ${source.telegramUsername}`);

      // Process messages in order (newest first)
      for (const message of messages) {
        totalFound++;

        // Check for duplicate using pre-fetched IDs
        if (existingIds.has(message.id.toString())) {
          console.log(`Found duplicate message ${message.id}, stopping scrape`);
          foundDuplicate = true;
          break;
        }

        // Save new post
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
          // Add to existing set to catch duplicates within same batch
          existingIds.add(message.id.toString());
        } catch (error) {
          // Handle race condition duplicates
          if ((error as { code?: string }).code === "P2002") {
            console.log(`Duplicate detected for message ${message.id}, stopping scrape`);
            foundDuplicate = true;
            break;
          }
          throw error;
        }
      }

      // Set offset for next batch (use lowest ID from current batch)
      if (messages.length > 0 && !foundDuplicate) {
        offsetId = Math.min(...messages.map((m: { id: number }) => m.id));
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

    // Update scrape log with success
    await prisma.scrapeLog.update({
      where: { id: scrapeLog.id },
      data: {
        status: "completed",
        postsFound: totalFound,
        newPosts: newCount,
        completedAt: new Date(),
      },
    });

    console.log(`Saved ${newCount} new messages from ${source.telegramUsername} (found duplicate: ${foundDuplicate})`);
  } catch (error) {
    await prisma.scrapeLog.update({
      where: { id: scrapeLog.id },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      },
    });
    throw error;
  } finally {
    await disconnectClient(client);
  }
}
