export interface SVGStyleConfig {
  stylePrompt?: string;
  themeColor: string;
  textColor: string;
  backgroundStyle: "solid" | "gradient" | "transparent";
  fontStyle: "modern" | "classic" | "playful" | "technical";
}

const fontStyleDescriptions: Record<string, Record<string, string>> = {
  en: {
    modern: "clean sans-serif fonts like Inter, Roboto, or Arial",
    classic: "elegant serif fonts like Georgia or Times New Roman",
    playful: "rounded, friendly fonts with personality",
    technical: "monospace or technical fonts like Consolas or Fira Code",
  },
  ru: {
    modern: "чистые шрифты без засечек, как Inter, Roboto или Arial",
    classic: "элегантные шрифты с засечками, как Georgia или Times New Roman",
    playful: "округлые, дружелюбные шрифты с характером",
    technical: "моноширинные или технические шрифты, как Consolas или Fira Code",
  },
};

const backgroundStyleDescriptions: Record<string, Record<string, string>> = {
  en: {
    solid: "solid color background",
    gradient: "smooth gradient background transitioning between colors",
    transparent: "transparent background with optional subtle patterns",
  },
  ru: {
    solid: "сплошной цветной фон",
    gradient: "плавный градиентный фон с переходом между цветами",
    transparent: "прозрачный фон с опциональными тонкими паттернами",
  },
};

export function getSVGSystemPrompt(language: string = "en"): string {
  if (language === "ru") {
    return `Ты — эксперт по созданию SVG-графики для Telegram-каналов. Ты создаёшь чистые, валидные SVG-изображения, которые идеально подходят для визуального контента в социальных сетях.

КРИТИЧЕСКИ ВАЖНО:
- Генерируй ТОЛЬКО валидный SVG-код, начинающийся с <svg и заканчивающийся </svg>
- НЕ добавляй объяснения, комментарии или markdown-разметку
- Размеры: ширина 1080px, высота 1080px (квадрат для Telegram)
- Используй встроенные стили (атрибут style) вместо CSS-классов
- Все тексты должны использовать стандартные системные шрифты
- Изображение должно хорошо смотреться на мобильных устройствах

РЕКОМЕНДАЦИИ ПО ДИЗАЙНУ:
- Создавай визуально привлекательные композиции с хорошей иерархией
- Используй контрастные цвета для читабельности
- Добавляй декоративные элементы (формы, линии, иконки) для визуального интереса
- Оставляй достаточно отступов по краям (минимум 60px)
- Текст должен быть достаточно крупным для чтения (минимум 36px для основного текста)`;
  }

  return `You are an expert SVG graphics creator for Telegram channels. You create clean, valid SVG images that work perfectly for social media visual content.

CRITICAL REQUIREMENTS:
- Generate ONLY valid SVG code starting with <svg and ending with </svg>
- NO explanations, comments, or markdown formatting
- Dimensions: 1080px width, 1080px height (square for Telegram)
- Use inline styles (style attribute) instead of CSS classes
- All text must use standard system fonts
- Images must look good on mobile devices

DESIGN GUIDELINES:
- Create visually appealing compositions with good hierarchy
- Use contrasting colors for readability
- Add decorative elements (shapes, lines, icons) for visual interest
- Leave adequate padding around edges (minimum 60px)
- Text should be large enough to read (minimum 36px for body text)`;
}

export function getSVGUserPrompt(
  postContent: string,
  style: SVGStyleConfig,
  language: string = "en"
): string {
  const fontDesc =
    fontStyleDescriptions[language]?.[style.fontStyle] ??
    fontStyleDescriptions["en"]?.[style.fontStyle] ??
    "clean sans-serif fonts";
  const bgDesc =
    backgroundStyleDescriptions[language]?.[style.backgroundStyle] ??
    backgroundStyleDescriptions["en"]?.[style.backgroundStyle] ??
    "solid color background";

  if (language === "ru") {
    let prompt = `Создай SVG-изображение для этого поста в Telegram:

СОДЕРЖАНИЕ ПОСТА:
"${postContent}"

ТРЕБОВАНИЯ К СТИЛЮ:
- Основной цвет: ${style.themeColor}
- Цвет текста: ${style.textColor}
- Стиль фона: ${bgDesc}
- Стиль шрифта: ${fontDesc}`;

    if (style.stylePrompt) {
      prompt += `
- Дополнительный стиль: ${style.stylePrompt}`;
    }

    prompt += `

ЗАДАЧА:
Создай красивое SVG-изображение размером 1080x1080, которое:
1. Визуально представляет основную идею поста
2. Может включать ключевые слова или короткую цитату из текста
3. Использует декоративные элементы, формы или простую иконографию
4. Выглядит профессионально и привлекательно

Ответь ТОЛЬКО валидным SVG-кодом.`;

    return prompt;
  }

  let prompt = `Create an SVG image for this Telegram post:

POST CONTENT:
"${postContent}"

STYLE REQUIREMENTS:
- Theme color: ${style.themeColor}
- Text color: ${style.textColor}
- Background style: ${bgDesc}
- Font style: ${fontDesc}`;

  if (style.stylePrompt) {
    prompt += `
- Additional style: ${style.stylePrompt}`;
  }

  prompt += `

TASK:
Create a beautiful 1080x1080 SVG image that:
1. Visually represents the main idea of the post
2. Can include key words or a short quote from the text
3. Uses decorative elements, shapes, or simple iconography
4. Looks professional and eye-catching

Respond with ONLY valid SVG code.`;

  return prompt;
}
