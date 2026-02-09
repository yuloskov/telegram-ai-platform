export * from "./svg-prompts";
export * from "./persona-prompts";

import { buildPersonaSystemPrompt } from "./persona-prompts";

export interface ChannelContext {
  niche?: string;
  tone: string;
  language: string;
  hashtags: string[];
  // Personal blog mode fields
  channelMode?: string;
  personaName?: string;
  personaDescription?: string;
  personaAssets?: Array<{ label: string; description?: string }>;
}

// Tone translations
const toneTranslations: Record<string, Record<string, string>> = {
  en: {
    professional: "professional",
    casual: "casual",
    humorous: "humorous",
    informative: "informative",
    inspirational: "inspirational",
  },
  ru: {
    professional: "профессиональный",
    casual: "неформальный",
    humorous: "юмористический",
    informative: "информативный",
    inspirational: "вдохновляющий",
  },
};

export function getSystemPrompt(channel: ChannelContext): string {
  // Use persona prompt for personal blog mode
  if (channel.channelMode === "personal_blog") {
    return buildPersonaSystemPrompt(channel);
  }

  const lang = channel.language;
  const tone = toneTranslations[lang]?.[channel.tone] || channel.tone;

  if (lang === "ru") {
    const nicheContext = channel.niche
      ? `Канал посвящён теме: ${channel.niche}.`
      : "";

    const hashtagsContext =
      channel.hashtags.length > 0
        ? `Часто используемые хештеги: ${channel.hashtags.join(", ")}.`
        : "";

    return `Ты — опытный создатель контента для Telegram-каналов. Твоя задача — генерировать увлекательные, качественные посты на русском языке.

Детали канала:
- Тон: ${tone}
- Язык: Русский
${nicheContext}
${hashtagsContext}

Правила:
1. Пиши в ${tone} тоне, подходящем для Telegram
2. Посты должны быть лаконичными, но увлекательными (оптимальная длина: 100-500 символов)
3. Используй форматирование (жирный, курсив) умеренно
4. Добавляй эмодзи естественно, но не злоупотребляй
5. Если указаны хештеги, органично добавляй их в конце
6. Никогда не добавляй ссылки, если не просят специально
7. Пиши оригинальный, уникальный контент
8. Пиши ТОЛЬКО на русском языке

Для форматирования в Telegram используй HTML:
- <b>жирный</b> для акцента
- <i>курсив</i> для мягкого выделения
- <code>код</code> для технических терминов
- Переносы строк для читабельности`;
  }

  // English (default)
  const nicheContext = channel.niche
    ? `The channel focuses on: ${channel.niche}.`
    : "";

  const hashtagsContext =
    channel.hashtags.length > 0
      ? `Commonly used hashtags: ${channel.hashtags.join(", ")}.`
      : "";

  return `You are an expert content creator for Telegram channels. Your task is to generate engaging, high-quality posts in English.

Channel Details:
- Tone: ${tone}
- Language: English
${nicheContext}
${hashtagsContext}

Guidelines:
1. Write in a ${tone} tone appropriate for Telegram
2. Keep posts concise but engaging (optimal length: 100-500 characters)
3. Use appropriate formatting (bold, italic) sparingly
4. Include relevant emojis naturally, but don't overuse
5. If hashtags are provided, incorporate them naturally at the end
6. Never include links unless specifically asked
7. Write original, unique content
8. Write ONLY in English

For Telegram formatting, use HTML:
- <b>bold</b> for emphasis
- <i>italic</i> for subtle emphasis
- <code>code</code> for technical terms
- Line breaks for readability`;
}

export function getGenerateFromPromptPrompt(
  userPrompt: string,
  additionalInstructions?: string,
  language: string = "en"
): string {
  if (language === "ru") {
    let prompt = `Сгенерируй пост для Telegram на основе этой темы/запроса:

"${userPrompt}"`;

    if (additionalInstructions) {
      prompt += `

Дополнительные инструкции от пользователя:
${additionalInstructions}`;
    }

    prompt += `

Ответь ТОЛЬКО текстом поста, готовым к публикации. Без пояснений или мета-комментариев.`;

    return prompt;
  }

  // English (default)
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
  additionalInstructions?: string,
  language: string = "en"
): string {
  if (language === "ru") {
    const postsContext = scrapedPosts
      .filter((p) => p.text)
      .map((p, i) => `Пост ${i + 1} (${p.views} просмотров):\n${p.text}`)
      .join("\n\n---\n\n");

    let prompt = `На основе этих популярных постов из похожих каналов, создай оригинальный пост, который использует их лучшие элементы, но будет полностью уникальным:

${postsContext}

Важно:
- НЕ копируй и не пересказывай близко к тексту ни один из постов
- Выдели ключевые темы и идеи, которые делают их увлекательными
- Создай что-то свежее и оригинальное, сохраняя релевантность
- Учитывай, почему эти посты были популярны (по количеству просмотров)`;

    if (additionalInstructions) {
      prompt += `

Дополнительные инструкции:
${additionalInstructions}`;
    }

    prompt += `

Ответь ТОЛЬКО текстом поста, готовым к публикации.`;

    return prompt;
  }

  // English (default)
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
  additionalInstructions?: string,
  language: string = "en"
): string {
  if (language === "ru") {
    const researchContext = researchResults
      .map((r, i) => `Источник ${i + 1}:\n${r}`)
      .join("\n\n---\n\n");

    let prompt = `На основе исследования темы "${topic}", создай информативный и увлекательный пост для Telegram:

Результаты исследования:
${researchContext}

Важно:
- Синтезируй информацию в связный, увлекательный пост
- Включи самые интересные или важные факты
- Сделай текст доступным для широкой аудитории
- Не включай URL или ссылки в пост`;

    if (additionalInstructions) {
      prompt += `

Дополнительные инструкции:
${additionalInstructions}`;
    }

    prompt += `

Ответь ТОЛЬКО текстом поста, готовым к публикации.`;

    return prompt;
  }

  // English (default)
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

export function getSuggestImagePromptPrompt(
  postContent: string,
  language: string = "en"
): string {
  if (language === "ru") {
    return `На основе этого поста для Telegram, предложи промпт для генерации релевантного, привлекательного изображения:

Пост:
"${postContent}"

Ответь ТОЛЬКО кратким промптом для генерации изображения (1-2 предложения на русском языке), который создаст визуально привлекательное изображение к этому посту. Изображение должно:
- Соответствовать теме поста
- Хорошо смотреться как изображение к посту в Telegram
- Быть визуально ярким, но не слишком сложным
- Не содержать текста`;
  }

  return `Based on this Telegram post, suggest a prompt for generating a relevant, eye-catching image:

Post:
"${postContent}"

Respond with ONLY a concise image generation prompt (1-2 sentences in English) that would create a visually appealing image to accompany this post. The image should:
- Be relevant to the post's topic
- Work well as a Telegram post image
- Be visually striking but not too complex
- Avoid text in the image`;
}

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

export function getGenerateMultiplePostsPrompt(
  scrapedPosts: Array<{ id: string; text: string | null; views: number }>,
  channelPreviousPosts: string[],
  count: number,
  customPrompt?: string,
  language: string = "en"
): string {
  // Shuffle and filter sources for diversity
  const filteredScraped = shuffleArray(scrapedPosts.filter((p) => p.text));

  if (language === "ru") {
    const scrapedContext = filteredScraped
      .map((p) => `[ID: ${p.id}] (${p.views} просмотров):\n${p.text}`)
      .join("\n\n---\n\n");

    const previousContext =
      channelPreviousPosts.length > 0
        ? `\n\nТВОИ ПРЕДЫДУЩИЕ ПОСТЫ (НЕ ПОВТОРЯЙ ЭТИ ТЕМЫ):\n${channelPreviousPosts.map((p, i) => `${i + 1}. ${p}`).join("\n\n")}`
        : "";

    let prompt = `На основе этих популярных постов из похожих каналов, создай ${count} РАЗНЫХ оригинальных постов:

ВДОХНОВЕНИЕ (популярные посты):
${scrapedContext}${previousContext}

КРИТИЧЕСКИ ВАЖНЫЕ ТРЕБОВАНИЯ:
- Создай ровно ${count} уникальных постов с разными подходами/углами
- НЕ повторяй темы, которые уже были в твоих предыдущих постах - каждый новый пост должен раскрывать НОВУЮ тему
- Каждый пост ДОЛЖЕН использовать минимум один источник (можно больше)
- Источники можно использовать повторно в разных постах при необходимости
- Если все источники на одну тему, найди разные углы: факты, мнение, практические советы, вопрос аудитории

ДРУГИЕ ТРЕБОВАНИЯ:
- НЕ копируй и не пересказывай близко посты-источники
- Сохраняй единый стиль канала во всех постах
- Каждый пост должен быть готов к публикации
- Для каждого поста укажи ID источников, которые ты использовал`;

    if (customPrompt) {
      prompt += `\n\nДОПОЛНИТЕЛЬНЫЕ ИНСТРУКЦИИ:\n${customPrompt}`;
    }

    prompt += `\n\nОтветь в JSON формате:
{
  "posts": [
    {
      "content": "текст поста 1",
      "angle": "краткое описание темы/подхода",
      "sourceIds": ["id1"]
    },
    {
      "content": "текст поста 2 (ДРУГАЯ тема!)",
      "angle": "краткое описание темы/подхода",
      "sourceIds": ["id2"]
    }
  ]
}

Ответь ТОЛЬКО валидным JSON без дополнительного текста.`;

    return prompt;
  }

  // English (default)
  const scrapedContext = filteredScraped
    .map((p) => `[ID: ${p.id}] (${p.views} views):\n${p.text}`)
    .join("\n\n---\n\n");

  const previousContext =
    channelPreviousPosts.length > 0
      ? `\n\nYOUR PREVIOUS POSTS (DO NOT REPEAT THESE TOPICS):\n${channelPreviousPosts.map((p, i) => `${i + 1}. ${p}`).join("\n\n")}`
      : "";

  let prompt = `Based on these trending posts from similar channels, create ${count} DIFFERENT original posts:

INSPIRATION (trending posts):
${scrapedContext}${previousContext}

CRITICAL REQUIREMENTS:
- Create exactly ${count} unique posts with different angles/approaches
- DO NOT repeat topics or themes already covered in your previous posts - each new post must explore a NEW topic
- Each post MUST use at least one source (can use more)
- Sources can be reused across posts if needed
- If all sources are about the same topic, find different angles: facts, opinion, practical tips, audience question

OTHER REQUIREMENTS:
- Do NOT copy or closely paraphrase the source posts
- Maintain consistent channel voice across all posts
- Each post should be ready to publish
- Include the source IDs you used for each post`;

  if (customPrompt) {
    prompt += `\n\nADDITIONAL INSTRUCTIONS:\n${customPrompt}`;
  }

  prompt += `\n\nRespond in JSON format:
{
  "posts": [
    {
      "content": "post text 1",
      "angle": "brief topic/approach description",
      "sourceIds": ["id1"]
    },
    {
      "content": "post text 2 (DIFFERENT topic!)",
      "angle": "brief topic/approach description",
      "sourceIds": ["id2"]
    }
  ]
}

Respond with ONLY valid JSON, no additional text.`;

  return prompt;
}

export interface ScrapedPostWithMedia {
  id: string;
  text: string | null;
  views: number;
  hasImages: boolean;
  imageCount: number;
}

export function getGenerateMultiplePostsWithImagesPrompt(
  scrapedPosts: ScrapedPostWithMedia[],
  channelPreviousPosts: string[],
  count: number,
  customPrompt?: string,
  language: string = "en"
): string {
  const filteredScraped = shuffleArray(scrapedPosts.filter((p) => p.text));
  const hasSources = filteredScraped.length > 0;

  if (language === "ru") {
    const previousContext =
      channelPreviousPosts.length > 0
        ? `\n\nТВОИ ПРЕДЫДУЩИЕ ПОСТЫ (НЕ ПОВТОРЯЙ ЭТИ ТЕМЫ):\n${channelPreviousPosts.map((p, i) => `${i + 1}. ${p}`).join("\n\n")}`
        : "";

    let prompt: string;

    if (hasSources) {
      const scrapedContext = filteredScraped
        .map((p) => {
          const mediaInfo = p.hasImages ? `, ${p.imageCount} изобр.` : "";
          return `[ID: ${p.id}] (${p.views} просмотров${mediaInfo}):\n${p.text}`;
        })
        .join("\n\n---\n\n");

      prompt = `На основе этих популярных постов из похожих каналов, создай ${count} РАЗНЫХ оригинальных постов с решением по изображениям для каждого:

ВДОХНОВЕНИЕ (популярные посты):
${scrapedContext}${previousContext}

КРИТИЧЕСКИ ВАЖНЫЕ ТРЕБОВАНИЯ:
- Создай ровно ${count} уникальных постов с разными подходами/углами
- НЕ повторяй темы, которые уже были в твоих предыдущих постах - каждый новый пост должен раскрывать НОВУЮ тему
- Каждый пост ДОЛЖЕН использовать минимум один источник (можно больше)
- Источники можно использовать повторно в разных постах при необходимости

РЕШЕНИЯ ПО ИЗОБРАЖЕНИЯМ:
Для каждого поста реши, нужны ли изображения:
- "none": Краткие мысли, цитаты, простые текстовые посты - не нужны изображения
- "use_original": Если источник имеет хорошие релевантные изображения - используй их
- "generate_new": Если нужна уникальная визуализация (инфографика, иллюстрация) - сгенерируй

Критерии:
- Новости/информация → часто нужны изображения
- Короткие мысли/мнения → обычно без изображений
- Если у источника есть хорошие изображения → используй оригинал
- Если нужна уникальная визуализация → генерируй новое`;
    } else {
      // No sources - generate from scratch using custom prompt
      prompt = `Создай ${count} РАЗНЫХ оригинальных постов для Telegram-канала с решением по изображениям для каждого:${previousContext}

ЗАДАНИЕ:
${customPrompt || "Создай увлекательные посты на любую тему, подходящую для канала"}

КРИТИЧЕСКИ ВАЖНЫЕ ТРЕБОВАНИЯ:
- Создай ровно ${count} уникальных постов с разными подходами/углами
- НЕ повторяй темы, которые уже были в твоих предыдущих постах - каждый новый пост должен раскрывать НОВУЮ тему
- Каждый пост должен быть уникальным и интересным
- Пиши контент с нуля, не опираясь на внешние источники

РЕШЕНИЯ ПО ИЗОБРАЖЕНИЯМ:
Для каждого поста реши, нужны ли изображения:
- "none": Краткие мысли, цитаты, простые текстовые посты - не нужны изображения
- "generate_new": Если нужна визуализация (инфографика, иллюстрация) - сгенерируй

Критерии:
- Информативный контент → часто нужны изображения
- Короткие мысли/мнения → обычно без изображений`;
    }

    if (hasSources && customPrompt) {
      prompt += `\n\nДОПОЛНИТЕЛЬНЫЕ ИНСТРУКЦИИ:\n${customPrompt}`;
    }

    prompt += `\n\nОтветь в JSON формате:
{
  "posts": [
    {
      "content": "текст поста",
      "angle": "краткое описание темы/подхода",
      "sourceIds": [${hasSources ? '"id1"' : ""}],
      "imageDecision": {
        "strategy": "none" | ${hasSources ? '"use_original" | ' : ""}"generate_new",
        ${hasSources ? '"originalImageSourceIds": ["id1"],' : ""}
        "imagePrompts": ["описание для генерации изображения"],
        "reasoning": "почему выбрана эта стратегия"
      }
    }
  ]
}

ВАЖНО:
${hasSources ? '- originalImageSourceIds - только если strategy = "use_original"\n' : ""}- imagePrompts - только если strategy = "generate_new" (1-2 предложения на РУССКОМ языке для генерации)
- sourceIds может быть пустым массивом если генерируешь без источников
- Ответь ТОЛЬКО валидным JSON без дополнительного текста.`;

    return prompt;
  }

  // English (default)
  const previousContext =
    channelPreviousPosts.length > 0
      ? `\n\nYOUR PREVIOUS POSTS (DO NOT REPEAT THESE TOPICS):\n${channelPreviousPosts.map((p, i) => `${i + 1}. ${p}`).join("\n\n")}`
      : "";

  let prompt: string;

  if (hasSources) {
    const scrapedContext = filteredScraped
      .map((p) => {
        const mediaInfo = p.hasImages ? `, ${p.imageCount} images` : "";
        return `[ID: ${p.id}] (${p.views} views${mediaInfo}):\n${p.text}`;
      })
      .join("\n\n---\n\n");

    prompt = `Based on these trending posts from similar channels, create ${count} DIFFERENT original posts with image decisions for each:

INSPIRATION (trending posts):
${scrapedContext}${previousContext}

CRITICAL REQUIREMENTS:
- Create exactly ${count} unique posts with different angles/approaches
- DO NOT repeat topics or themes already covered in your previous posts - each new post must explore a NEW topic
- Each post MUST use at least one source (can use more)
- Sources can be reused across posts if needed

IMAGE DECISIONS:
For each post, decide if images are needed:
- "none": Short thoughts, quotes, simple text posts - no images needed
- "use_original": If source has good relevant images - use them
- "generate_new": If unique visualization needed (infographic, illustration) - generate new

Criteria:
- News/informational content → often needs images
- Short thoughts/opinions → usually no images
- If source has good images → use original
- If unique visualization needed → generate new`;
  } else {
    // No sources - generate from scratch using custom prompt
    prompt = `Create ${count} DIFFERENT original posts for a Telegram channel with image decisions for each:${previousContext}

TASK:
${customPrompt || "Create engaging posts on any topic suitable for the channel"}

CRITICAL REQUIREMENTS:
- Create exactly ${count} unique posts with different angles/approaches
- DO NOT repeat topics or themes already covered in your previous posts - each new post must explore a NEW topic
- Each post should be unique and engaging
- Write content from scratch, without relying on external sources

IMAGE DECISIONS:
For each post, decide if images are needed:
- "none": Short thoughts, quotes, simple text posts - no images needed
- "generate_new": If visualization needed (infographic, illustration) - generate new

Criteria:
- Informational content → often needs images
- Short thoughts/opinions → usually no images`;
  }

  if (hasSources && customPrompt) {
    prompt += `\n\nADDITIONAL INSTRUCTIONS:\n${customPrompt}`;
  }

  prompt += `\n\nRespond in JSON format:
{
  "posts": [
    {
      "content": "post text",
      "angle": "brief topic/approach description",
      "sourceIds": [${hasSources ? '"id1"' : ""}],
      "imageDecision": {
        "strategy": "none" | ${hasSources ? '"use_original" | ' : ""}"generate_new",
        ${hasSources ? '"originalImageSourceIds": ["id1"],' : ""}
        "imagePrompts": ["image generation prompt"],
        "reasoning": "why this strategy was chosen"
      }
    }
  ]
}

IMPORTANT:
${hasSources ? '- originalImageSourceIds - only if strategy = "use_original"\n' : ""}- imagePrompts - only if strategy = "generate_new" (1-2 sentences in English for generation)
- sourceIds can be an empty array when generating without sources
- Respond with ONLY valid JSON, no additional text.`;

  return prompt;
}
