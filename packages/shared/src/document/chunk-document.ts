export interface DocumentChunk {
  index: number;
  title: string;
  content: string;
}

/**
 * Simple paragraph-based chunking for documents.
 * Splits text by double newlines and groups into chunks of reasonable size.
 */
export function chunkDocumentByParagraphs(
  text: string,
  options?: {
    minChunkSize?: number;
    maxChunkSize?: number;
  }
): DocumentChunk[] {
  const minChunkSize = options?.minChunkSize ?? 1000;
  const maxChunkSize = options?.maxChunkSize ?? 4000;

  // Split by double newlines (paragraphs)
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks: DocumentChunk[] = [];
  let currentContent = "";
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed max size, save current chunk
    if (currentContent.length + paragraph.length > maxChunkSize && currentContent.length >= minChunkSize) {
      chunks.push({
        index: chunkIndex++,
        title: extractTitle(currentContent),
        content: currentContent.trim(),
      });
      currentContent = "";
    }

    currentContent += (currentContent ? "\n\n" : "") + paragraph;
  }

  // Add remaining content as final chunk
  if (currentContent.trim().length > 0) {
    chunks.push({
      index: chunkIndex,
      title: extractTitle(currentContent),
      content: currentContent.trim(),
    });
  }

  return chunks;
}

/**
 * Extract a title from the first line of content
 */
function extractTitle(content: string): string {
  const firstLine = content.split("\n")[0] ?? "";
  // Clean up the title - remove special characters, limit length
  const cleaned = firstLine
    .replace(/^[#\-*•]+\s*/, "") // Remove markdown headers
    .replace(/[^\w\sа-яА-ЯёЁ]/g, " ") // Keep letters, numbers, spaces
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length > 100 ? cleaned.substring(0, 97) + "..." : cleaned || "Section";
}

/**
 * Strip markdown code blocks from AI response
 */
function stripCodeBlocks(text: string): string {
  // Remove ```json ... ``` or ``` ... ``` blocks
  return text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
}

/**
 * Parse AI response for document chunking into structured chunks
 */
export function parseAIChunks(aiResponse: string): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];

  // Strip code blocks if present
  const cleanedResponse = stripCodeBlocks(aiResponse);

  // Try to parse JSON array
  try {
    const parsed = JSON.parse(cleanedResponse);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((chunk) => chunk.content && chunk.content.trim().length > 0)
        .map((chunk, index) => ({
          index,
          title: chunk.title || `Section ${index + 1}`,
          content: chunk.content.trim(),
        }));
    }
  } catch {
    // Not valid JSON, try to parse markdown-style chunks
  }

  // Parse markdown-style chunks (## Title\n\nContent)
  const sections = aiResponse.split(/(?=^##\s)/m);
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]?.trim();
    if (!section) continue;

    const titleMatch = section.match(/^##\s*(.+?)(?:\n|$)/);
    const title = titleMatch?.[1]?.trim() || `Section ${i + 1}`;
    const content = section.replace(/^##\s*.+?\n/, "").trim();

    if (content) {
      chunks.push({ index: i, title, content });
    }
  }

  return chunks.length > 0 ? chunks : [{ index: 0, title: "Document", content: aiResponse }];
}
