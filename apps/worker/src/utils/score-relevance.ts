import { chat } from "@repo/ai";
import type { PageInfo, ChannelContext, ScoredPage } from "@repo/shared/website";

/**
 * Use AI to score page relevance to a channel's niche.
 * Single batch call for cost-effectiveness.
 */
export async function scorePageRelevance(
  pages: PageInfo[],
  channelContext: ChannelContext
): Promise<ScoredPage[]> {
  if (pages.length === 0) return [];

  const pageList = pages
    .map((p, i) => `${i + 1}. URL: ${p.url}${p.title ? ` | Title: ${p.title}` : ""}`)
    .join("\n");

  const contextDesc = [
    channelContext.niche && `Niche: ${channelContext.niche}`,
    channelContext.description && `Description: ${channelContext.description}`,
    channelContext.language && `Language: ${channelContext.language}`,
  ]
    .filter(Boolean)
    .join(", ");

  const systemPrompt = `You are a content relevance scoring assistant. Score how relevant each web page is for a specific content channel.

Channel context: ${contextDesc || "General content channel"}

Score each page from 0.0 (completely irrelevant) to 1.0 (highly relevant).
Consider the URL path, page title, and how well it matches the channel's niche.

Return ONLY a valid JSON array of objects with "index" (1-based) and "score" fields.
Example: [{"index": 1, "score": 0.8}, {"index": 2, "score": 0.1}]`;

  const userPrompt = `Score these ${pages.length} pages for relevance:\n\n${pageList}`;

  try {
    const response = await chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.1, maxTokens: 4000 }
    );

    const cleaned = response
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as Array<{ index: number; score: number }>;

    return pages.map((page, i) => {
      const entry = parsed.find((p) => p.index === i + 1);
      return {
        url: page.url,
        score: entry ? Math.min(1, Math.max(0, entry.score)) : 0.5,
      };
    });
  } catch (error) {
    console.error("AI relevance scoring failed:", error);
    // Fallback: mark all as moderately relevant
    return pages.map((page) => ({ url: page.url, score: 0.5 }));
  }
}
