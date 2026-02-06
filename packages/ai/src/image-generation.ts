import { getAIClient, chat, type ChatMessage } from "./client";

const IMAGE_GENERATION_MODEL =
  process.env.IMAGE_GENERATION_MODEL ?? "google/gemini-2.5-flash-image";

const IMAGE_PROMPT_MODEL =
  process.env.IMAGE_PROMPT_MODEL ?? "google/gemini-2.0-flash-001";

// Model for image editing (requires multimodal input/output support)
const IMAGE_EDITING_MODEL =
  process.env.IMAGE_EDITING_MODEL ?? "google/gemini-2.5-flash-image";

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

/**
 * Clean an image by recreating it without watermarks
 * Asks the AI to create a very similar image based on the source
 * Uses Gemini 2.5 Flash Image model which supports image generation
 * @param sourceImageUrl - Base64 data URL of the source image
 * @returns Base64 data URL of the recreated image, or null if failed
 */
export async function cleanImage(sourceImageUrl: string): Promise<string | null> {
  const client = getAIClient();

  try {
    const response = await client.chat.completions.create({
      model: IMAGE_EDITING_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: sourceImageUrl },
            },
            {
              type: "text",
              text: `Look at this reference image and create a very similar new image with the same subject, composition, colors, and style. Focus only on the main visual content - do NOT include any logos, watermarks, text overlays, channel names, URLs, or @usernames that may be visible in the reference. The new image should be clean and free of any branding or attribution marks. Generate the image now.`,
            },
          ],
        },
      ],
      // @ts-expect-error - OpenRouter-specific parameter for image output
      modalities: ["text", "image"],
    });

    // Extract image from response
    const message = response.choices[0]?.message;
    const messageObj = message as unknown as Record<string, unknown>;

    // Debug logging
    console.log("Clean image response keys:", Object.keys(messageObj || {}));

    // Check message.images array (OpenRouter Gemini format - base64 data URLs)
    if (messageObj?.images && Array.isArray(messageObj.images)) {
      console.log("Found images array with", messageObj.images.length, "items");
      const firstImage = messageObj.images[0];
      if (typeof firstImage === "string" && firstImage.startsWith("data:image")) {
        return firstImage;
      }
      // Handle object format
      if (firstImage && typeof firstImage === "object") {
        const imgObj = firstImage as Record<string, unknown>;
        if (imgObj.type === "image_url" && imgObj.image_url) {
          const imageUrl = imgObj.image_url as { url?: string };
          if (imageUrl.url && typeof imageUrl.url === "string") {
            return imageUrl.url;
          }
        }
        // Direct url property
        if (typeof imgObj.url === "string") {
          return imgObj.url;
        }
      }
    }

    // Handle string content (direct base64)
    const content = message?.content;
    if (typeof content === "string") {
      console.log("Content is string, length:", content.length, "starts with:", content.slice(0, 50));
      if (content.startsWith("data:image")) {
        return content;
      }
    }

    // Handle array content (multimodal responses)
    const contentArray = content as unknown;
    if (contentArray && Array.isArray(contentArray)) {
      console.log("Content is array with", contentArray.length, "items");
      for (const part of contentArray) {
        if (part && typeof part === "object") {
          const partObj = part as Record<string, unknown>;
          console.log("Part type:", partObj.type);

          if (partObj.type === "image_url" && partObj.image_url) {
            const imageUrl = partObj.image_url as { url?: string };
            if (imageUrl.url && typeof imageUrl.url === "string") {
              return imageUrl.url;
            }
          }

          if (partObj.inline_data) {
            const inlineData = partObj.inline_data as { mime_type?: string; data?: string };
            if (inlineData.mime_type && inlineData.data) {
              return `data:${inlineData.mime_type};base64,${inlineData.data}`;
            }
          }
        }
      }
    }

    console.error("No image found in clean response. Full message:", JSON.stringify(message, null, 2));
    return null;
  } catch (error) {
    console.error("Image cleaning error:", error);
    if (error instanceof Error && error.message.includes("429")) {
      throw new Error("Rate limit exceeded. Please wait a moment and try again.");
    }
    throw error;
  }
}

/**
 * Generate an image prompt from post content
 * Analyzes the post text and creates a prompt suitable for image generation
 * @param postContent - The text content of the post
 * @param language - Language for the prompt (default: "en")
 */
export async function generateImagePromptFromContent(
  postContent: string,
  language: string = "en"
): Promise<string | null> {
  const languageInstruction =
    language === "ru"
      ? "Создай промпт на АНГЛИЙСКОМ языке (для генератора изображений)"
      : "Create the prompt in English";

  const systemPrompt = `You are a creative director who creates concise image generation prompts.
Your task is to analyze social media post content and create a single, focused prompt that would generate an engaging, visually appealing image to accompany the post.

Guidelines:
- The prompt should be 1-3 sentences
- Focus on the main theme or concept, not literal text
- Describe visual elements, style, and mood
- The image should be suitable for a Telegram channel
- No text or watermarks in the generated image
- ${languageInstruction}`;

  const userPrompt = `Create an image generation prompt for this social media post:

"${postContent}"

Respond with ONLY the image prompt, nothing else.`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  try {
    const response = await chat(messages, {
      maxTokens: 200,
      temperature: 0.7,
      model: IMAGE_PROMPT_MODEL,
    });

    return response.trim();
  } catch (error) {
    console.error("Image prompt generation error:", error);
    return null;
  }
}
