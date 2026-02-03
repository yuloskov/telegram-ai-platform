export interface SVGStyleConfig {
  stylePrompt?: string;
  themeColor: string;
  textColor: string;
  backgroundStyle: "solid" | "gradient" | "transparent";
  fontStyle: "modern" | "classic" | "playful" | "technical";
}

// Use Noto Sans - bundled with excellent Cyrillic support
const fontStyleDescriptions: Record<string, Record<string, string>> = {
  en: {
    modern: "clean sans-serif using Noto Sans",
    classic: "elegant styling using Noto Sans with refined spacing",
    playful: "rounded, friendly styling using Noto Sans",
    technical: "technical styling using Noto Sans",
  },
  ru: {
    modern: "чистый sans-serif шрифт Noto Sans",
    classic: "элегантный стиль с использованием Noto Sans",
    playful: "округлый, дружелюбный стиль с Noto Sans",
    technical: "технический стиль с Noto Sans",
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
- Изображение должно хорошо смотреться на мобильных устройствах

ШРИФТЫ (ОБЯЗАТЕЛЬНО):
- ВСЕГДА используй font-family="Noto Sans, sans-serif" для всего текста
- ВСЕГДА указывай атрибут font-family на каждом элементе <text>
- Noto Sans полностью поддерживает кириллицу

ПРАВИЛА РАЗМЕЩЕНИЯ ТЕКСТА:
- Весь текст должен находиться в безопасной зоне: минимум 100px от всех краёв
- Максимум 35-40 символов на строку для русского текста
- Для длинного текста используй несколько элементов <text> или <tspan>
- Используй text-anchor="middle" для центрирования текста
- Текст должен быть достаточно крупным для чтения (минимум 36px для основного текста)

ЭМОДЗИ:
- Используй эмодзи для визуального интереса (😀, 🎯, ✅, 📚, 💡 и т.д.)

РЕКОМЕНДАЦИИ ПО ДИЗАЙНУ:
- Создавай визуально привлекательные композиции с хорошей иерархией
- Используй контрастные цвета для читабельности`;
  }

  return `You are an expert SVG graphics creator for Telegram channels. You create clean, valid SVG images that work perfectly for social media visual content.

CRITICAL REQUIREMENTS:
- Generate ONLY valid SVG code starting with <svg and ending with </svg>
- NO explanations, comments, or markdown formatting
- Dimensions: 1080px width, 1080px height (square for Telegram)
- Use inline styles (style attribute) instead of CSS classes
- Images must look good on mobile devices

FONT REQUIREMENTS (MANDATORY):
- For ALL text, use font-family="Noto Sans, sans-serif"
- ALWAYS specify the font-family attribute on every <text> element
- Noto Sans has excellent Cyrillic support

TEXT LAYOUT RULES:
- Keep ALL text within a 100px safe zone from all edges
- Maximum 45-50 characters per line for English, 35-40 for Russian/Cyrillic
- Use multiple <text> or <tspan> elements for long text
- Use text-anchor="middle" for center-aligned text
- Text should be large enough to read (minimum 36px for body text)

EMOJIS:
- Use emojis for visual interest (😀, 🎯, ✅, 📚, 💡, etc.)

DESIGN GUIDELINES:
- Create visually appealing compositions with good hierarchy
- Use contrasting colors for readability`;
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
