import { prisma } from "@repo/database";
import { getFileBuffer } from "@repo/shared/storage";
import { parsePdf, chunkDocumentByParagraphs, parseAIChunks } from "@repo/shared/document";
import { chat } from "@repo/ai";
import type { DocumentParsingJobPayload } from "@repo/shared/queues";

const DEFAULT_CHUNK_PROMPT = `You are a document analyzer. Split the provided document into logical, self-contained sections for educational content.

CRITICAL RULES FOR NUMBER OF SECTIONS:
- Create as MANY sections as the content naturally has - there is NO fixed number
- Short documents (under 2000 chars) may have 2-5 sections
- Medium documents (2000-10000 chars) may have 5-20 sections
- Long documents (10000+ chars) may have 20-50+ sections
- Each distinct topic, rule, word list, or concept should be its OWN section
- Word lists and vocabulary should be split into MULTIPLE smaller chunks (10-20 words per chunk)
- NEVER combine unrelated topics just to reduce the number of sections

Each section should:
1. Cover ONE complete topic, rule, or small word group
2. Be self-contained and understandable on its own
3. Be between 200-1500 characters (prefer smaller, focused chunks)
4. Have a clear, descriptive title in the same language as the content`;

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
 * Parse a document and create ScrapedContent chunks
 */
export async function handleParseDocumentJob(data: DocumentParsingJobPayload): Promise<void> {
  const { sourceId, documentUrl } = data;

  const source = await prisma.contentSource.findUnique({
    where: { id: sourceId },
  });

  if (!source) {
    throw new Error(`Content source not found: ${sourceId}`);
  }

  if (source.sourceType !== "document") {
    throw new Error(`Source ${sourceId} is not a document source`);
  }

  // Parse the storage path
  const pathParts = documentUrl.split("/");
  const bucket = pathParts[0];
  const objectName = pathParts.slice(1).join("/");

  if (!bucket || !objectName) {
    throw new Error(`Invalid document URL: ${documentUrl}`);
  }

  console.log(`Downloading document from ${bucket}/${objectName}`);
  const buffer = await getFileBuffer(bucket, objectName);

  console.log(`Parsing PDF (${buffer.length} bytes)`);
  const parsed = await parsePdf(buffer);
  console.log(`Extracted ${parsed.numPages} pages, ${parsed.text.length} characters`);

  // Build system prompt (custom or default)
  const systemPrompt = buildSystemPrompt(source.chunkingPrompt);
  console.log(`Using ${source.chunkingPrompt ? "custom" : "default"} chunking prompt`);

  // Try AI-based chunking first, fall back to paragraph-based
  let chunks = await chunkWithAI(parsed.text, systemPrompt);

  if (chunks.length === 0) {
    console.log("AI chunking returned no results, falling back to paragraph chunking");
    chunks = chunkDocumentByParagraphs(parsed.text);
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

  // Update source with lastScrapedAt
  await prisma.contentSource.update({
    where: { id: sourceId },
    data: { lastScrapedAt: new Date() },
  });

  console.log(`Document parsing complete: ${chunks.length} chunks saved`);
}

/**
 * Use AI to intelligently chunk the document
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

  // Split long documents into parts and process each
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
 * Process a single part of document with AI
 */
async function processChunkWithAI(
  text: string,
  systemPrompt: string
): Promise<Array<{ index: number; title: string; content: string }>> {
  try {
    const response = await chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Split this document into logical sections:\n\n${text}` },
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
