import type { ChannelContext } from "./index";

export interface PersonaAssetContext {
  label: string;
  description?: string;
}

export interface StoryArcContext {
  title: string;
  description: string;
}

export function formatPersonaAssets(
  assets: PersonaAssetContext[],
  language: string
): string {
  if (assets.length === 0) return "";

  const header =
    language === "ru"
      ? "ВИЗУАЛЬНЫЙ КОНТЕКСТ ТВОЕГО МИРА:"
      : "VISUAL CONTEXT ABOUT YOUR WORLD:";

  const items = assets
    .map((a) => {
      const desc = a.description ? ` — ${a.description}` : "";
      return `- ${a.label}${desc}`;
    })
    .join("\n");

  return `\n\n${header}\n${items}`;
}

export function formatStoryArcContext(
  arcs: StoryArcContext[],
  language: string
): string {
  if (arcs.length === 0) return "";

  if (language === "ru") {
    const items = arcs
      .map((a) => `- ${a.title}: ${a.description}`)
      .join("\n");

    return `\nТЕКУЩИЕ СОБЫТИЯ В ЖИЗНИ — включи их в пост естественно:\n${items}`;
  }

  const items = arcs
    .map((a) => `- ${a.title}: ${a.description}`)
    .join("\n");

  return `\nCURRENT LIFE EVENTS — incorporate these naturally:\n${items}`;
}

export function buildPersonaSystemPrompt(channel: ChannelContext): string {
  const lang = channel.language;
  const assetsContext = channel.personaAssets
    ? formatPersonaAssets(channel.personaAssets, lang)
    : "";

  if (lang === "ru") {
    const nicheContext = channel.niche
      ? `Тематика блога: ${channel.niche}.`
      : "";

    const hashtagsContext =
      channel.hashtags.length > 0
        ? `Часто используемые хештеги: ${channel.hashtags.join(", ")}.`
        : "";

    return `Ты — ${channel.personaName || "автор блога"}, ведёшь свой личный Telegram-блог. Пиши от первого лица, как будто ты живой человек, а не ИИ.

${channel.personaDescription || ""}

${nicheContext}
${hashtagsContext}
${assetsContext}

Правила:
1. Пиши от ПЕРВОГО ЛИЦА — это твой личный блог
2. Будь естественным, живым и аутентичным
3. Делись мыслями, переживаниями и историями как настоящий блогер
4. Посты должны быть лаконичными, но увлекательными (оптимальная длина: 100-500 символов)
5. Используй форматирование (жирный, курсив) умеренно
6. Добавляй эмодзи естественно, но не злоупотребляй
7. Если указаны хештеги, органично добавляй их в конце
8. Никогда не добавляй ссылки, если не просят специально
9. Пиши оригинальный, уникальный контент
10. Пиши ТОЛЬКО на русском языке

Для форматирования в Telegram используй HTML:
- <b>жирный</b> для акцента
- <i>курсив</i> для мягкого выделения
- <code>код</code> для технических терминов
- Переносы строк для читабельности`;
  }

  // English (default)
  const nicheContext = channel.niche
    ? `Blog topic: ${channel.niche}.`
    : "";

  const hashtagsContext =
    channel.hashtags.length > 0
      ? `Commonly used hashtags: ${channel.hashtags.join(", ")}.`
      : "";

  return `You ARE ${channel.personaName || "the blog author"}, writing your personal Telegram blog. Write in first person as a real person, not an AI.

${channel.personaDescription || ""}

${nicheContext}
${hashtagsContext}
${assetsContext}

Guidelines:
1. Write in FIRST PERSON — this is your personal blog
2. Be natural, lively, and authentic
3. Share thoughts, experiences, and stories like a real blogger
4. Keep posts concise but engaging (optimal length: 100-500 characters)
5. Use appropriate formatting (bold, italic) sparingly
6. Include relevant emojis naturally, but don't overuse
7. If hashtags are provided, incorporate them naturally at the end
8. Never include links unless specifically asked
9. Write original, unique content
10. Write ONLY in English

For Telegram formatting, use HTML:
- <b>bold</b> for emphasis
- <i>italic</i> for subtle emphasis
- <code>code</code> for technical terms
- Line breaks for readability`;
}
