import { prisma } from "@repo/database";
import { fetchWebpage, extractContent } from "@repo/shared/webpage";
import { hashContent } from "@repo/shared/website";
import type { WebsitePageParseJobPayload } from "@repo/shared/queues";
import { chunkContent } from "../utils/chunk-content.js";
import { checkAndFinalizeCrawl } from "./crawl-website-finalize.js";

/**
 * Parse a single website page. Reuses existing webpage extraction logic.
 * Supports content hash comparison to skip unchanged pages.
 */
export async function handleParseWebsitePageJob(data: WebsitePageParseJobPayload): Promise<void> {
  const { sourceId, pageId, pageUrl, previousHash } = data;

  const page = await prisma.websitePage.findUnique({ where: { id: pageId } });
  if (!page) {
    throw new Error(`Website page not found: ${pageId}`);
  }

  const source = await prisma.contentSource.findUnique({ where: { id: sourceId } });
  if (!source) {
    throw new Error(`Content source not found: ${sourceId}`);
  }

  // Mark page as scraping
  await prisma.websitePage.update({
    where: { id: pageId },
    data: { status: "scraping" },
  });

  try {
    // Fetch the page
    const result = await fetchWebpage(pageUrl, { timeout: 15000 });
    const extracted = extractContent(result.html, result.url);

    if (extracted.content.length < 100) {
      await markPageFailed(pageId, "Content too short");
      await tryFinalize(sourceId);
      return;
    }

    // Compute content hash
    const newHash = hashContent(extracted.content);

    // If hash matches previous, skip re-processing (just update lastScrapedAt)
    if (previousHash && newHash === previousHash) {
      console.log(`Page unchanged (hash match), skipping: ${pageUrl}`);
      await prisma.websitePage.update({
        where: { id: pageId },
        data: { status: "scraped", lastScrapedAt: new Date() },
      });
      await tryFinalize(sourceId);
      return;
    }

    // Delete existing ScrapedContent for this page
    await prisma.scrapedContent.deleteMany({
      where: { websitePageId: pageId },
    });

    // Chunk the content
    const chunks = await chunkContent(extracted.content, {
      skipChunking: source.skipChunking,
      chunkingPrompt: source.chunkingPrompt,
      title: extracted.title,
    });

    // Save chunks with websitePageId
    for (const chunk of chunks) {
      await prisma.scrapedContent.create({
        data: {
          sourceId,
          websitePageId: pageId,
          chunkIndex: chunk.index,
          sectionTitle: chunk.title,
          text: chunk.content,
          scrapedAt: new Date(),
        },
      });
    }

    // Update page record
    await prisma.websitePage.update({
      where: { id: pageId },
      data: {
        status: "scraped",
        title: extracted.title,
        contentHash: newHash,
        lastScrapedAt: new Date(),
        error: null,
      },
    });

    console.log(`Parsed website page: ${pageUrl} (${chunks.length} chunks)`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to parse page";
    console.error(`Failed to parse page ${pageUrl}:`, errorMessage);
    await markPageFailed(pageId, errorMessage);
  }

  await tryFinalize(sourceId);
}

async function markPageFailed(pageId: string, error: string): Promise<void> {
  await prisma.websitePage.update({
    where: { id: pageId },
    data: { status: "failed", error },
  });
}

async function tryFinalize(sourceId: string): Promise<void> {
  try {
    await checkAndFinalizeCrawl(sourceId);
  } catch (error) {
    console.error(`Finalize check failed for ${sourceId}:`, error);
  }
}
