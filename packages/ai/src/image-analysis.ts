import { getAIClient } from "./client";

const IMAGE_ANALYSIS_MODEL = process.env.IMAGE_ANALYSIS_MODEL ?? "google/gemini-3";

export interface ImageAnalysisResult {
  hasWatermark: boolean;
  hasLink: boolean;
  hasLogo: boolean;
  reasoning: string;
  suggestedPrompt?: string;
}

export interface ImageContentResult {
  description: string;
  textContent: string | null;
  mainElements: string[];
  mood: string;
  colors: string[];
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

/**
 * Extract content and description from an image for SVG generation
 * @param imageUrl - URL or base64 data URL of the image to analyze
 * @param language - Language for the description (default: "en")
 */
export async function extractImageContent(
  imageUrl: string,
  language: string = "en"
): Promise<ImageContentResult> {
  const client = getAIClient();

  const languageInstruction =
    language === "ru"
      ? "Отвечай на РУССКОМ языке"
      : "Respond in English";

  try {
    const response = await client.chat.completions.create({
      model: IMAGE_ANALYSIS_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this image and extract its content for creating a similar visual representation. ${languageInstruction}.

IMPORTANT: When extracting text content, you MUST:
- EXCLUDE any URLs, website links, or @usernames
- EXCLUDE any company names, brand names, or channel names
- EXCLUDE any logos or watermark text
- ONLY include the main message/quote/headline text that conveys the core idea

Respond in JSON format:
{
  "description": "A concise description of what the image shows (1-2 sentences)",
  "textContent": "The main message/quote text only, WITHOUT any links, company names, or branding (or null if no meaningful text)",
  "mainElements": ["List", "of", "main", "visual", "elements"],
  "mood": "The overall mood/feeling of the image (e.g., professional, playful, serious, inspiring)",
  "colors": ["List", "of", "dominant", "colors", "in", "hex", "format"]
}

Focus on:
- What message or concept the image conveys (without attribution to any brand/company)
- Key visual elements that could be recreated
- The emotional tone and style
- Only the core text message, cleaned of any promotional or identifying content`,
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content ?? "";

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        description: parsed.description ?? "Image content",
        textContent: parsed.textContent ?? null,
        mainElements: parsed.mainElements ?? [],
        mood: parsed.mood ?? "neutral",
        colors: parsed.colors ?? [],
      };
    }

    // Fallback if JSON parsing fails
    return {
      description: "Image content",
      textContent: null,
      mainElements: [],
      mood: "neutral",
      colors: [],
    };
  } catch (error) {
    console.error("Image content extraction error:", error);
    return {
      description: "Image content",
      textContent: null,
      mainElements: [],
      mood: "neutral",
      colors: [],
    };
  }
}
