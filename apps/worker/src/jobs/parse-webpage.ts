import { prisma } from "@repo/database";
import { fetchWebpage, extractContent } from "@repo/shared/webpage";
import type { WebpageParsingJobPayload } from "@repo/shared/queues";
import { chunkContent } from "../utils/chunk-content.js";

/**
 * Parse a web page and create ScrapedContent chunks
 */
export async function handleParseWebpageJob(data: WebpageParsingJobPayload): Promise<void> {
  const { sourceId, webpageUrl } = data;

  const source = await prisma.contentSource.findUnique({
    where: { id: sourceId },
  });

  if (!source) {
    throw new Error(`Content source not found: ${sourceId}`);
  }

  if (source.sourceType !== "webpage") {
    throw new Error(`Source ${sourceId} is not a webpage source`);
  }

  console.log(`Fetching webpage: ${webpageUrl}`);

  let html: string;
  let finalUrl: string;
  try {
    const result = await fetchWebpage(webpageUrl);
    html = result.html;
    finalUrl = result.url;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch webpage";
    console.error(`Failed to fetch webpage: ${errorMessage}`);

    await prisma.contentSource.update({
      where: { id: sourceId },
      data: { webpageError: errorMessage },
    });

    throw error;
  }

  const useFullExtraction = source.skipChunking === true;
  console.log(`Extracting content from ${finalUrl} (fullExtraction: ${useFullExtraction})`);
  const extracted = extractContent(html, finalUrl, { fullExtraction: useFullExtraction });
  console.log(`Extracted ${extracted.content.length} characters, title: "${extracted.title}"`);

  if (extracted.content.length < 100) {
    const errorMessage = "Page content too short (less than 100 characters)";
    await prisma.contentSource.update({
      where: { id: sourceId },
      data: { webpageError: errorMessage },
    });
    throw new Error(errorMessage);
  }

  const chunks = await chunkContent(extracted.content, {
    skipChunking: source.skipChunking,
    chunkingPrompt: source.chunkingPrompt,
    title: extracted.title,
  });

  console.log(`Created ${chunks.length} chunks`);

  // Delete existing chunks for this source
  await prisma.scrapedContent.deleteMany({
    where: { sourceId },
  });

  // Create ScrapedContent records for each chunk
  for (const chunk of chunks) {
    await prisma.scrapedContent.create({
      data: {
        sourceId,
        chunkIndex: chunk.index,
        sectionTitle: chunk.title,
        text: chunk.content,
        scrapedAt: new Date(),
      },
    });
  }

  // Update source with metadata and clear any previous error
  await prisma.contentSource.update({
    where: { id: sourceId },
    data: {
      webpageTitle: extracted.title,
      webpageDomain: extracted.domain,
      webpageError: null,
      lastScrapedAt: new Date(),
    },
  });

  console.log(`Webpage parsing complete: ${chunks.length} chunks saved`);
}
