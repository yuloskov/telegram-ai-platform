import { chat, type ChatMessage } from "./client";
import {
  getSystemPrompt,
  getGenerateFromPromptPrompt,
  getGenerateFromScrapedPrompt,
  getSuggestImagePromptPrompt,
  getGenerateMultiplePostsPrompt,
  getGenerateMultiplePostsWithImagesPrompt,
  type ChannelContext,
  type ScrapedPostWithMedia,
} from "./prompts";

export interface GenerationResult {
  content: string;
  suggestedImagePrompt?: string;
}

export async function generateFromPrompt(
  channel: ChannelContext,
  prompt: string,
  additionalInstructions?: string
): Promise<GenerationResult> {
  const systemPrompt = getSystemPrompt(channel);
  const userPrompt = getGenerateFromPromptPrompt(prompt, additionalInstructions, channel.language);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const content = await chat(messages);

  // Generate image prompt suggestion
  const imagePromptMessages: ChatMessage[] = [
    { role: "user", content: getSuggestImagePromptPrompt(content, channel.language) },
  ];
  const suggestedImagePrompt = await chat(imagePromptMessages, {
    maxTokens: 200,
  });

  return {
    content: content.trim(),
    suggestedImagePrompt: suggestedImagePrompt.trim(),
  };
}

export async function generateFromScrapedContent(
  channel: ChannelContext,
  scrapedPosts: Array<{ text: string | null; views: number }>,
  additionalInstructions?: string
): Promise<GenerationResult> {
  const systemPrompt = getSystemPrompt(channel);
  const userPrompt = getGenerateFromScrapedPrompt(
    scrapedPosts,
    additionalInstructions,
    channel.language
  );

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const content = await chat(messages);

  // Generate image prompt suggestion
  const imagePromptMessages: ChatMessage[] = [
    { role: "user", content: getSuggestImagePromptPrompt(content, channel.language) },
  ];
  const suggestedImagePrompt = await chat(imagePromptMessages, {
    maxTokens: 200,
  });

  return {
    content: content.trim(),
    suggestedImagePrompt: suggestedImagePrompt.trim(),
  };
}

export async function regenerateContent(
  channel: ChannelContext,
  originalPrompt: string,
  previousContent: string,
  feedback: string
): Promise<GenerationResult> {
  const systemPrompt = getSystemPrompt(channel);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: originalPrompt },
    { role: "assistant", content: previousContent },
    {
      role: "user",
      content: `Please regenerate the post with this feedback in mind: ${feedback}

Respond with ONLY the new post content.`,
    },
  ];

  const content = await chat(messages);

  return {
    content: content.trim(),
  };
}

export async function suggestImagePrompt(
  postContent: string,
  language: string = "en"
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "user", content: getSuggestImagePromptPrompt(postContent, language) },
  ];

  const result = await chat(messages, { maxTokens: 200 });
  return result.trim();
}

/**
 * Edit post content using an AI prompt/instruction.
 * The user provides the current content and an instruction for how to modify it.
 */
export async function editPostWithPrompt(
  currentContent: string,
  editInstruction: string,
  language: string = "en"
): Promise<string> {
  const systemPrompt = language === "ru"
    ? `Ты редактор постов для Telegram-каналов. Твоя задача - изменить пост согласно инструкции пользователя.
Правила:
- Верни ТОЛЬКО отредактированный текст поста, без объяснений
- Сохрани форматирование Telegram (эмодзи, переносы строк) если они есть
- Не добавляй кавычки или другое обрамление вокруг текста
- Следуй инструкции точно`
    : `You are a Telegram channel post editor. Your task is to modify the post according to the user's instruction.
Rules:
- Return ONLY the edited post text, no explanations
- Preserve Telegram formatting (emojis, line breaks) if present
- Don't add quotes or other wrapping around the text
- Follow the instruction precisely`;

  const userPrompt = language === "ru"
    ? `Текущий пост:
"""
${currentContent}
"""

Инструкция по редактированию: ${editInstruction}

Отредактированный пост:`
    : `Current post:
"""
${currentContent}
"""

Edit instruction: ${editInstruction}

Edited post:`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const result = await chat(messages, { maxTokens: 2048 });
  return result.trim();
}

export interface MultiGenerationPost {
  content: string;
  angle: string;
  sourceIds: string[];
}

export interface MultiGenerationResult {
  posts: MultiGenerationPost[];
}

export async function generateMultiplePosts(
  channel: ChannelContext,
  scrapedPosts: Array<{ id: string; text: string | null; views: number }>,
  channelPreviousPosts: string[],
  customPrompt?: string,
  count: number = 3
): Promise<MultiGenerationResult> {
  const systemPrompt = getSystemPrompt(channel);
  const userPrompt = getGenerateMultiplePostsPrompt(
    scrapedPosts,
    channelPreviousPosts,
    count,
    customPrompt,
    channel.language
  );

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const response = await chat(messages, { maxTokens: 4000 });

  // Parse JSON response
  try {
    // Try to extract JSON from the response (handle potential markdown code blocks)
    let jsonStr = response.trim();
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith("```")) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);

    if (!parsed.posts || !Array.isArray(parsed.posts)) {
      throw new Error("Invalid response format: missing posts array");
    }

    return {
      posts: parsed.posts.map((post: { content?: string; angle?: string; sourceIds?: string[] }) => ({
        content: (post.content || "").trim(),
        angle: (post.angle || "").trim(),
        sourceIds: Array.isArray(post.sourceIds) ? post.sourceIds : [],
      })),
    };
  } catch (error) {
    // If JSON parsing fails, try to salvage the response as a single post
    console.error("Failed to parse multi-post response:", error);
    return {
      posts: [
        {
          content: response.trim(),
          angle: "Generated content",
          sourceIds: [],
        },
      ],
    };
  }
}

export type ImageStrategy = "none" | "use_original" | "generate_new";

export interface ImageDecision {
  strategy: ImageStrategy;
  originalImageSourceIds?: string[];
  imagePrompts?: string[];
  reasoning?: string;
}

export interface MultiGenerationPostWithImages {
  content: string;
  angle: string;
  sourceIds: string[];
  imageDecision: ImageDecision;
}

export interface MultiGenerationResultWithImages {
  posts: MultiGenerationPostWithImages[];
}

export async function generateMultiplePostsWithImages(
  channel: ChannelContext,
  scrapedPosts: ScrapedPostWithMedia[],
  channelPreviousPosts: string[],
  customPrompt?: string,
  count: number = 3
): Promise<MultiGenerationResultWithImages> {
  const systemPrompt = getSystemPrompt(channel);
  const userPrompt = getGenerateMultiplePostsWithImagesPrompt(
    scrapedPosts,
    channelPreviousPosts,
    count,
    customPrompt,
    channel.language
  );

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const response = await chat(messages, { maxTokens: 4000 });

  try {
    let jsonStr = response.trim();
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith("```")) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);

    if (!parsed.posts || !Array.isArray(parsed.posts)) {
      throw new Error("Invalid response format: missing posts array");
    }

    return {
      posts: parsed.posts.map((post: {
        content?: string;
        angle?: string;
        sourceIds?: string[];
        imageDecision?: {
          strategy?: string;
          originalImageSourceIds?: string[];
          imagePrompts?: string[];
          reasoning?: string;
        };
      }) => ({
        content: (post.content || "").trim(),
        angle: (post.angle || "").trim(),
        sourceIds: Array.isArray(post.sourceIds) ? post.sourceIds : [],
        imageDecision: {
          strategy: (post.imageDecision?.strategy as ImageStrategy) || "none",
          originalImageSourceIds: post.imageDecision?.originalImageSourceIds,
          imagePrompts: post.imageDecision?.imagePrompts,
          reasoning: post.imageDecision?.reasoning,
        },
      })),
    };
  } catch (error) {
    console.error("Failed to parse multi-post with images response:", error);
    return {
      posts: [
        {
          content: response.trim(),
          angle: "Generated content",
          sourceIds: [],
          imageDecision: { strategy: "none" },
        },
      ],
    };
  }
}
