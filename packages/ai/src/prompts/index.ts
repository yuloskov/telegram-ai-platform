export interface ChannelContext {
  niche?: string;
  tone: string;
  language: string;
  hashtags: string[];
}

export function getSystemPrompt(channel: ChannelContext): string {
  const nicheContext = channel.niche
    ? `The channel focuses on: ${channel.niche}.`
    : "";

  const hashtagsContext =
    channel.hashtags.length > 0
      ? `Commonly used hashtags: ${channel.hashtags.join(", ")}.`
      : "";

  return `You are an expert content creator for Telegram channels. Your task is to generate engaging, high-quality posts.

Channel Details:
- Tone: ${channel.tone}
- Language: ${channel.language === "ru" ? "Russian" : "English"}
${nicheContext}
${hashtagsContext}

Guidelines:
1. Write in a ${channel.tone} tone appropriate for Telegram
2. Keep posts concise but engaging (optimal length: 100-500 characters)
3. Use appropriate formatting (bold, italic) sparingly
4. Include relevant emojis naturally, but don't overuse
5. If hashtags are provided, incorporate them naturally at the end
6. Never include links unless specifically asked
7. Write original, unique content
8. Match the specified language exactly

For Telegram formatting, use:
- **bold** for emphasis
- _italic_ for subtle emphasis
- \`code\` for technical terms
- Line breaks for readability`;
}

export function getGenerateFromPromptPrompt(
  userPrompt: string,
  additionalInstructions?: string
): string {
  let prompt = `Generate a Telegram post based on this topic/prompt:

"${userPrompt}"`;

  if (additionalInstructions) {
    prompt += `

Additional instructions from the user:
${additionalInstructions}`;
  }

  prompt += `

Respond with ONLY the post content, ready to be published. No explanations or meta-commentary.`;

  return prompt;
}

export function getGenerateFromScrapedPrompt(
  scrapedPosts: Array<{ text: string | null; views: number }>,
  additionalInstructions?: string
): string {
  const postsContext = scrapedPosts
    .filter((p) => p.text)
    .map((p, i) => `Post ${i + 1} (${p.views} views):\n${p.text}`)
    .join("\n\n---\n\n");

  let prompt = `Based on these trending posts from similar channels, create an original post that captures the engaging elements but is completely unique:

${postsContext}

Important:
- Do NOT copy or closely paraphrase any of the posts
- Extract the key themes and topics that make them engaging
- Create something fresh and original while maintaining relevance
- Consider why these posts were popular (based on view counts)`;

  if (additionalInstructions) {
    prompt += `

Additional instructions:
${additionalInstructions}`;
  }

  prompt += `

Respond with ONLY the post content, ready to be published.`;

  return prompt;
}

export function getGenerateFromResearchPrompt(
  topic: string,
  researchResults: string[],
  additionalInstructions?: string
): string {
  const researchContext = researchResults
    .map((r, i) => `Source ${i + 1}:\n${r}`)
    .join("\n\n---\n\n");

  let prompt = `Based on this research about "${topic}", create an informative and engaging Telegram post:

Research Findings:
${researchContext}

Important:
- Synthesize the information into a coherent, engaging post
- Include the most interesting or important facts
- Make it accessible to a general audience
- Do not include URLs or citations in the post`;

  if (additionalInstructions) {
    prompt += `

Additional instructions:
${additionalInstructions}`;
  }

  prompt += `

Respond with ONLY the post content, ready to be published.`;

  return prompt;
}

export function getSuggestImagePromptPrompt(postContent: string): string {
  return `Based on this Telegram post, suggest a prompt for generating a relevant, eye-catching image:

Post:
"${postContent}"

Respond with ONLY a concise image generation prompt (1-2 sentences) that would create a visually appealing image to accompany this post. The image should:
- Be relevant to the post's topic
- Work well as a Telegram post image
- Be visually striking but not too complex
- Avoid text in the image`;
}
