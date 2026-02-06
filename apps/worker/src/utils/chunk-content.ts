import { chat } from "@repo/ai";
import { chunkDocumentByParagraphs, parseAIChunks } from "@repo/shared/document";

export const DEFAULT_CHUNK_PROMPT = `You are a content strategist preparing source material for Telegram post generation.

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

export const CHUNK_OUTPUT_FORMAT = `MANDATORY OUTPUT FORMAT - You MUST return ONLY a valid JSON array:
[
  { "title": "Section Title", "content": "Section content here..." },
  { "title": "Another Section", "content": "Content..." }
]

IMPORTANT:
- Return ONLY the JSON array, no markdown code blocks, no explanations
- The "content" field should contain PLAIN TEXT, not JSON
- Every section must have both "title" and "content" fields
- Do NOT wrap in \`\`\`json\`\`\` code blocks`;

export function buildSystemPrompt(customPrompt: string | null): string {
  const basePrompt = customPrompt || DEFAULT_CHUNK_PROMPT;
  return `${basePrompt}\n\n${CHUNK_OUTPUT_FORMAT}`;
}

/**
 * Use AI to intelligently chunk the content.
 * Handles long content by splitting into parts.
 */
export async function chunkWithAI(
  text: string,
  systemPrompt: string
): Promise<Array<{ index: number; title: string; content: string }>> {
  const MAX_CHARS = 50000;

  if (text.length <= MAX_CHARS) {
    return processChunkWithAI(text, systemPrompt);
  }

  const allChunks: Array<{ index: number; title: string; content: string }> = [];
  let offset = 0;
  let globalIndex = 0;

  while (offset < text.length) {
    let endPos = offset + MAX_CHARS;
    if (endPos < text.length) {
      const breakPoint = text.lastIndexOf("\n\n", endPos);
      if (breakPoint > offset + MAX_CHARS / 2) {
        endPos = breakPoint;
      }
    }

    const part = text.slice(offset, Math.min(endPos, text.length));
    const partChunks = await processChunkWithAI(part, systemPrompt);

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
export async function processChunkWithAI(
  text: string,
  systemPrompt: string
): Promise<Array<{ index: number; title: string; content: string }>> {
  try {
    const response = await chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Split this web page content into logical sections:\n\n${text}` },
      ],
      { temperature: 0.3, maxTokens: 8000 }
    );
    return parseAIChunks(response);
  } catch (error) {
    console.error("AI chunking failed:", error);
    return [];
  }
}

/**
 * Full chunking pipeline: try AI first, fall back to paragraph-based.
 */
export async function chunkContent(
  text: string,
  options: { skipChunking?: boolean; chunkingPrompt?: string | null; title?: string }
): Promise<Array<{ index: number; title: string; content: string }>> {
  if (options.skipChunking) {
    return [{ index: 0, title: options.title || "Content", content: text }];
  }

  const systemPrompt = buildSystemPrompt(options.chunkingPrompt ?? null);
  let chunks = await chunkWithAI(text, systemPrompt);

  if (chunks.length === 0) {
    console.log("AI chunking returned no results, falling back to paragraph chunking");
    chunks = chunkDocumentByParagraphs(text);
  }

  return chunks;
}
