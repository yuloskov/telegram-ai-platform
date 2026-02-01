import { prisma } from "@repo/database";
import { fetchWebpage, extractContent } from "@repo/shared/webpage";
import { chunkDocumentByParagraphs, parseAIChunks } from "@repo/shared/document";
import { chat } from "@repo/ai";
import type { WebpageParsingJobPayload } from "@repo/shared/queues";

const DEFAULT_CHUNK_PROMPT = `You are a content strategist preparing source material for Telegram post generation.

YOUR GOAL: Split the web page content into LARGE, COMPLETE chunks. Each chunk must contain enough context and substance to serve as the SOLE source for generating a full, engaging Telegram post.

CRITICAL RULES:
- Create FEWER, LARGER chunks - quality over quantity
- Each chunk should be 1000-4000 characters (aim for the higher end)
- A chunk must tell a COMPLETE story, idea, or concept - never fragment content
- If content is related, keep it together in ONE chunk
- Only split when topics are genuinely distinct and unrelated
- Short pages (under 3000 chars): often just 1-2 chunks is best
- Medium pages (3000-10000 chars): typically 2-5 chunks
- Long pages (10000+ chars): typically 5-15 chunks

EACH CHUNK MUST:
1. Be completely self-contained - a reader should understand it without any other context
2. Contain enough substance to generate a full, valuable post (not just a fragment)
3. Include relevant examples, details, or explanations that support the main point
4. Have a clear, descriptive title in the content's language

DO NOT create chunks that are:
- Just lists of words or bullet points without context
- Incomplete thoughts or fragments
- Too short to generate meaningful content from
- Missing necessary background information`;

const CHUNK_OUTPUT_FORMAT = `MANDATORY OUTPUT FORMAT - You MUST return ONLY a valid JSON array:
[
  { "title": "Section Title", "content": "Section content here..." },
  { "title": "Another Section", "content": "Content..." }
]

IMPORTANT:
- Return ONLY the JSON array, no markdown code blocks, no explanations
- The "content" field should contain PLAIN TEXT, not JSON
- Every section must have both "title" and "content" fields
- Do NOT wrap in \`\`\`json\`\`\` code blocks`;

function buildSystemPrompt(customPrompt: string | null): string {
  const basePrompt = customPrompt || DEFAULT_CHUNK_PROMPT;
  return `${basePrompt}\n\n${CHUNK_OUTPUT_FORMAT}`;
}

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

    // Update source with error
    await prisma.contentSource.update({
      where: { id: sourceId },
      data: { webpageError: errorMessage },
    });

    throw error;
  }

  // Use full extraction mode when skipChunking is enabled (to capture all content)
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

  let chunks: Array<{ index: number; title: string; content: string }>;

  if (source.skipChunking) {
    // Skip chunking - save whole content as single chunk
    console.log("Skip chunking enabled - saving whole article as single chunk");
    chunks = [{
      index: 0,
      title: extracted.title,
      content: extracted.content,
    }];
  } else {
    // Build system prompt (custom or default)
    const systemPrompt = buildSystemPrompt(source.chunkingPrompt);
    console.log(`Using ${source.chunkingPrompt ? "custom" : "default"} chunking prompt`);

    // Try AI-based chunking first, fall back to paragraph-based
    chunks = await chunkWithAI(extracted.content, systemPrompt);

    if (chunks.length === 0) {
      console.log("AI chunking returned no results, falling back to paragraph chunking");
      chunks = chunkDocumentByParagraphs(extracted.content);
    }
  }

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

/**
 * Use AI to intelligently chunk the content
 */
async function chunkWithAI(
  text: string,
  systemPrompt: string
): Promise<Array<{ index: number; title: string; content: string }>> {
  // If text is too long, process in parts
  const MAX_CHARS = 50000;

  if (text.length <= MAX_CHARS) {
    return await processChunkWithAI(text, systemPrompt);
  }

  // Split long content into parts and process each
  const allChunks: Array<{ index: number; title: string; content: string }> = [];
  let offset = 0;
  let globalIndex = 0;

  while (offset < text.length) {
    // Find a good break point (paragraph boundary)
    let endPos = offset + MAX_CHARS;
    if (endPos < text.length) {
      const breakPoint = text.lastIndexOf("\n\n", endPos);
      if (breakPoint > offset + MAX_CHARS / 2) {
        endPos = breakPoint;
      }
    }

    const part = text.slice(offset, Math.min(endPos, text.length));
    const partChunks = await processChunkWithAI(part, systemPrompt);

    // Re-index chunks with global index
    for (const chunk of partChunks) {
      allChunks.push({
        index: globalIndex++,
        title: chunk.title,
        content: chunk.content,
      });
    }

    offset = endPos;
  }

  return allChunks;
}

/**
 * Process a single part of content with AI
 */
async function processChunkWithAI(
  text: string,
  systemPrompt: string
): Promise<Array<{ index: number; title: string; content: string }>> {
  try {
    const response = await chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Split this web page content into logical sections:\n\n${text}` },
      ],
      {
        temperature: 0.3,
        maxTokens: 8000,
      }
    );

    return parseAIChunks(response);
  } catch (error) {
    console.error("AI chunking failed:", error);
    return [];
  }
}
