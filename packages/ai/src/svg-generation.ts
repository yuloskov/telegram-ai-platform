import { chat, type ChatMessage } from "./client";
import {
  getSVGSystemPrompt,
  getSVGUserPrompt,
  type SVGStyleConfig,
} from "./prompts/svg-prompts";

export type { SVGStyleConfig } from "./prompts/svg-prompts";

export interface SVGGenerationResult {
  svg: string;
  prompt: string;
}

/**
 * Validate that a string is valid SVG markup
 */
export function validateSVG(svg: string): boolean {
  if (!svg || typeof svg !== "string") {
    return false;
  }

  const trimmed = svg.trim();

  // Must start with <svg and end with </svg>
  if (!trimmed.startsWith("<svg") || !trimmed.endsWith("</svg>")) {
    return false;
  }

  // Check for required attributes
  if (!trimmed.includes("xmlns")) {
    return false;
  }

  // Basic structure validation - check for matching tags
  const openTags = (trimmed.match(/<[a-z][^/>]*>/gi) || []).length;
  const closeTags = (trimmed.match(/<\/[a-z]+>/gi) || []).length;
  const selfClosingTags = (trimmed.match(/<[a-z][^>]*\/>/gi) || []).length;

  // Tags should roughly balance (self-closing don't need closing tags)
  return openTags <= closeTags + selfClosingTags + 5; // Allow some tolerance
}

/**
 * Add XML declaration with UTF-8 encoding for proper Cyrillic support
 */
function addXmlDeclaration(svg: string): string {
  if (svg.trim().startsWith("<?xml")) {
    return svg;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n${svg}`;
}

/**
 * Sanitize SVG to remove potentially harmful elements
 */
export function sanitizeSVG(svg: string): string {
  let sanitized = svg.trim();

  // Remove any script tags
  sanitized = sanitized.replace(/<script[\s\S]*?<\/script>/gi, "");

  // Remove event handlers (onclick, onload, etc.)
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "");

  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, "");

  // Remove data: URLs except for images
  sanitized = sanitized.replace(
    /(?<!xlink:)href\s*=\s*["']data:(?!image\/)[^"']*["']/gi,
    ""
  );

  // Remove foreign object elements (can contain HTML)
  sanitized = sanitized.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "");

  // Ensure xmlns is present
  if (!sanitized.includes('xmlns="http://www.w3.org/2000/svg"')) {
    sanitized = sanitized.replace(
      "<svg",
      '<svg xmlns="http://www.w3.org/2000/svg"'
    );
  }

  // Add XML declaration with UTF-8 encoding for Cyrillic support
  return addXmlDeclaration(sanitized);
}

/**
 * Extract SVG from AI response (handles markdown code blocks)
 */
function extractSVGFromResponse(response: string): string | null {
  let svg = response.trim();

  // Remove markdown code blocks
  if (svg.startsWith("```svg")) {
    svg = svg.slice(6);
  } else if (svg.startsWith("```xml")) {
    svg = svg.slice(6);
  } else if (svg.startsWith("```")) {
    svg = svg.slice(3);
  }

  if (svg.endsWith("```")) {
    svg = svg.slice(0, -3);
  }

  svg = svg.trim();

  // Find SVG tags if there's extra text
  const svgStart = svg.indexOf("<svg");
  const svgEnd = svg.lastIndexOf("</svg>");

  if (svgStart !== -1 && svgEnd !== -1) {
    svg = svg.slice(svgStart, svgEnd + 6);
  }

  return svg.startsWith("<svg") && svg.endsWith("</svg>") ? svg : null;
}

/**
 * Generate an SVG image based on post content and style configuration
 */
export async function generateSVG(
  postContent: string,
  style: SVGStyleConfig,
  language: string = "en"
): Promise<SVGGenerationResult | null> {
  const systemPrompt = getSVGSystemPrompt(language);
  const userPrompt = getSVGUserPrompt(postContent, style, language);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  try {
    const response = await chat(messages, {
      maxTokens: 4096,
      temperature: 0.7,
    });

    const svg = extractSVGFromResponse(response);

    if (!svg) {
      console.error("Failed to extract SVG from response");
      return null;
    }

    if (!validateSVG(svg)) {
      console.error("Generated SVG failed validation");
      return null;
    }

    const sanitized = sanitizeSVG(svg);

    return {
      svg: sanitized,
      prompt: userPrompt,
    };
  } catch (error) {
    console.error("SVG generation error:", error);
    throw error;
  }
}

/**
 * Regenerate SVG with feedback
 */
export async function regenerateSVG(
  postContent: string,
  style: SVGStyleConfig,
  previousSVG: string,
  feedback: string,
  language: string = "en"
): Promise<SVGGenerationResult | null> {
  const systemPrompt = getSVGSystemPrompt(language);
  const userPrompt = getSVGUserPrompt(postContent, style, language);

  const feedbackPrompt =
    language === "ru"
      ? `Предыдущий SVG нужно улучшить. Обратная связь: ${feedback}

Сгенерируй новый, улучшенный SVG. Ответь ТОЛЬКО валидным SVG-кодом.`
      : `The previous SVG needs improvement. Feedback: ${feedback}

Generate a new, improved SVG. Respond with ONLY valid SVG code.`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
    { role: "assistant", content: previousSVG },
    { role: "user", content: feedbackPrompt },
  ];

  try {
    const response = await chat(messages, {
      maxTokens: 4096,
      temperature: 0.8,
    });

    const svg = extractSVGFromResponse(response);

    if (!svg) {
      console.error("Failed to extract regenerated SVG from response");
      return null;
    }

    if (!validateSVG(svg)) {
      console.error("Regenerated SVG failed validation");
      return null;
    }

    const sanitized = sanitizeSVG(svg);

    return {
      svg: sanitized,
      prompt: feedbackPrompt,
    };
  } catch (error) {
    console.error("SVG regeneration error:", error);
    throw error;
  }
}
