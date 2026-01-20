import { getAIClient } from "./client";

const IMAGE_GENERATION_MODEL = "google/gemini-2.0-flash-exp:free";

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

    // Extract image from response
    const content = response.choices[0]?.message?.content;

    console.log("Image generation response type:", typeof content);
    console.log("Image generation response preview:",
      typeof content === "string"
        ? content.substring(0, 200)
        : JSON.stringify(content)?.substring(0, 200)
    );

    if (typeof content === "string" && content.startsWith("data:image")) {
      return content;
    }

    // Check for image in multimodal response
    const message = response.choices[0]?.message;
    if (message && Array.isArray(message.content)) {
      for (const part of message.content) {
        if (typeof part === "object" && "image_url" in part) {
          return (part as { image_url: { url: string } }).image_url.url;
        }
        // Also check for inline_data format (Gemini native format)
        if (typeof part === "object" && "inline_data" in part) {
          const inlineData = part as { inline_data: { mime_type: string; data: string } };
          return `data:${inlineData.inline_data.mime_type};base64,${inlineData.inline_data.data}`;
        }
      }
    }

    console.error("No image in response. Full response:", JSON.stringify(response, null, 2));
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
