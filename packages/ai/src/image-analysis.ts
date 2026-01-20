import { getAIClient } from "./client";

const IMAGE_ANALYSIS_MODEL = process.env.IMAGE_ANALYSIS_MODEL ?? "google/gemini-3";

export interface ImageAnalysisResult {
  hasWatermark: boolean;
  hasLink: boolean;
  hasLogo: boolean;
  reasoning: string;
  suggestedPrompt?: string;
}

/**
 * Analyze an image for watermarks, links, logos using vision AI
 * @param imageUrl - URL or base64 data URL of the image to analyze
 * @param language - Language for suggested replacement prompts (default: "en")
 */
export async function analyzeImage(
  imageUrl: string,
  language: string = "en"
): Promise<ImageAnalysisResult> {
  const client = getAIClient();

  const languageInstruction =
    language === "ru"
      ? "Если найдены проблемы, предложи промпт на РУССКОМ языке для генерации похожего, но чистого изображения"
      : "If issues found, suggest a prompt in English to generate a similar but clean replacement image";

  try {
    const response = await client.chat.completions.create({
      model: IMAGE_ANALYSIS_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this image for the following issues that would make it unsuitable for reposting:

1. WATERMARKS - Any visible watermark text, logo, or branding overlaid on the image
2. LINKS/URLS - Any visible website URLs, @usernames, or channel links
3. LOGOS - Prominent brand logos or channel branding

Respond in JSON format:
{
  "hasWatermark": boolean,
  "hasLink": boolean,
  "hasLogo": boolean,
  "reasoning": "Brief explanation of what was found",
  "suggestedPrompt": "${languageInstruction} (or null if image is clean)"
}

Be strict - if you see ANY overlaid text, watermark, channel name, or URL, mark it as having issues.`,
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content ?? "";

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        hasWatermark: Boolean(parsed.hasWatermark),
        hasLink: Boolean(parsed.hasLink),
        hasLogo: Boolean(parsed.hasLogo),
        reasoning: parsed.reasoning ?? "Analysis complete",
        suggestedPrompt: parsed.suggestedPrompt ?? undefined,
      };
    }

    // Fallback if JSON parsing fails
    return {
      hasWatermark: false,
      hasLink: false,
      hasLogo: false,
      reasoning: "Could not parse analysis result",
    };
  } catch (error) {
    console.error("Image analysis error:", error);
    return {
      hasWatermark: false,
      hasLink: false,
      hasLogo: false,
      reasoning: `Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Check if analysis result indicates issues
 */
export function hasIssues(result: ImageAnalysisResult): boolean {
  return result.hasWatermark || result.hasLink || result.hasLogo;
}

/**
 * Analyze multiple images in parallel
 * Returns a map of image URL to analysis result
 */
export async function analyzeImages(
  imageUrls: string[]
): Promise<Map<string, ImageAnalysisResult>> {
  const results = new Map<string, ImageAnalysisResult>();

  // Process in batches to avoid rate limiting
  const batchSize = 3;
  for (let i = 0; i < imageUrls.length; i += batchSize) {
    const batch = imageUrls.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (url) => {
        const result = await analyzeImage(url);
        return { url, result };
      })
    );

    for (const { url, result } of batchResults) {
      results.set(url, result);
    }
  }

  return results;
}
