import { chat, type ChatMessage } from "./client";
import {
  getSystemPrompt,
  getGenerateFromPromptPrompt,
  getGenerateFromScrapedPrompt,
  getSuggestImagePromptPrompt,
  type ChannelContext,
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
    { role: "user", content: getSuggestImagePromptPrompt(content) },
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
    { role: "user", content: getSuggestImagePromptPrompt(content) },
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

export async function suggestImagePrompt(postContent: string): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "user", content: getSuggestImagePromptPrompt(postContent) },
  ];

  const result = await chat(messages, { maxTokens: 200 });
  return result.trim();
}
