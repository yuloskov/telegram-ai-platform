import { getAIClient } from "./client";

const IMAGE_GENERATION_MODEL =
  process.env.IMAGE_GENERATION_MODEL ?? "google/gemini-2.0-flash-exp:free";

export interface GeneratedImage {
  url: string;
  prompt: string;
}

/**
 * Generate an image using Gemini via OpenRouter
 * Returns base64 image data that can be uploaded to storage
 */
export async function generateImage(prompt: string): Promise<string | null> {
  const client = getAIClient();

  try {
    const response = await client.chat.completions.create({
      model: IMAGE_GENERATION_MODEL,
      messages: [
        {
          role: "user",
          content: `Generate an image: ${prompt}

The image should be:
- High quality and visually appealing
- Suitable for a Telegram channel post
- Without any text or watermarks
- Professional and engaging`,
        },
      ],
      // OpenRouter passes through image generation capabilities
      // @ts-expect-error - OpenRouter-specific parameter
      modalities: ["text", "image"],
    });

    // Extract image from response - handle multiple formats
    const message = response.choices[0]?.message;
    const messageObj = message as unknown as Record<string, unknown>;

    // Check message.images array (Gemini via OpenRouter format)
    if (messageObj?.images && Array.isArray(messageObj.images)) {
      for (const img of messageObj.images) {
        if (img && typeof img === "object") {
          const imgObj = img as Record<string, unknown>;
          if (imgObj.type === "image_url" && imgObj.image_url) {
            const imageUrl = imgObj.image_url as { url?: string };
            if (imageUrl.url && typeof imageUrl.url === "string") {
              console.log("Found image in message.images array");
              return imageUrl.url;
            }
          }
        }
      }
    }

    // Handle string content (direct base64)
    const content = message?.content;
    if (typeof content === "string" && content.startsWith("data:image")) {
      return content;
    }

    // Handle array content (multimodal responses)
    const contentArray = content as unknown;
    if (contentArray && Array.isArray(contentArray)) {
      for (const part of contentArray) {
        if (part && typeof part === "object") {
          const partObj = part as Record<string, unknown>;

          // Format: { type: "image_url", image_url: { url: "data:..." } }
          if (partObj.type === "image_url" && partObj.image_url) {
            const imageUrl = partObj.image_url as { url?: string };
            if (imageUrl.url && typeof imageUrl.url === "string") {
              return imageUrl.url;
            }
          }

          // Format: { inline_data: { mime_type: "...", data: "..." } } (Gemini native)
          if (partObj.inline_data) {
            const inlineData = partObj.inline_data as { mime_type?: string; data?: string };
            if (inlineData.mime_type && inlineData.data) {
              return `data:${inlineData.mime_type};base64,${inlineData.data}`;
            }
          }
        }
      }
    }

    console.error("No image found in response");
    return null;
  } catch (error) {
    console.error("Image generation error:", error);
    // Re-throw with more context for rate limit errors
    if (error instanceof Error && error.message.includes("429")) {
      throw new Error("Rate limit exceeded. Please wait a moment and try again.");
    }
    throw error;
  }
}

/**
 * Generate multiple images from prompts
 * Returns array of results with urls and prompts
 */
export async function generateImages(prompts: string[]): Promise<GeneratedImage[]> {
  const results: GeneratedImage[] = [];

  for (const prompt of prompts) {
    const imageData = await generateImage(prompt);
    if (imageData) {
      results.push({ url: imageData, prompt });
    }
  }

  return results;
}
