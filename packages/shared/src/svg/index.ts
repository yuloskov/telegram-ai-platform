export interface SvgToPngOptions {
  width?: number;
  height?: number;
  fitTo?: "width" | "height" | "zoom";
  background?: string;
}

/**
 * Convert SVG string to PNG buffer
 * Uses dynamic import to avoid webpack bundling native module
 * @param svgString - Valid SVG markup
 * @param options - Optional rendering options
 * @returns PNG image as Buffer
 */
export async function svgToPng(
  svgString: string,
  options: SvgToPngOptions = {}
): Promise<Buffer> {
  const { width = 1080, background } = options;

  // Dynamic import to avoid webpack bundling the native module
  const { Resvg } = await import("@resvg/resvg-js");

  const resvg = new Resvg(svgString, {
    fitTo: {
      mode: "width",
      value: width,
    },
    background,
    font: {
      loadSystemFonts: true,
      // Use fonts with excellent Cyrillic support
      // DejaVu Sans and Noto Sans are widely available on Linux/Docker
      defaultFontFamily: "DejaVu Sans, Noto Sans, Liberation Sans, Arial",
    },
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  return Buffer.from(pngBuffer);
}

/**
 * Get SVG dimensions from markup
 */
export function getSvgDimensions(
  svgString: string
): { width: number; height: number } | null {
  const widthMatch = svgString.match(/width\s*=\s*["']?(\d+)/i);
  const heightMatch = svgString.match(/height\s*=\s*["']?(\d+)/i);

  if (widthMatch?.[1] && heightMatch?.[1]) {
    return {
      width: parseInt(widthMatch[1], 10),
      height: parseInt(heightMatch[1], 10),
    };
  }

  // Try viewBox
  const viewBoxMatch = svgString.match(
    /viewBox\s*=\s*["']?\s*[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)/i
  );

  if (viewBoxMatch?.[1] && viewBoxMatch?.[2]) {
    return {
      width: Math.round(parseFloat(viewBoxMatch[1])),
      height: Math.round(parseFloat(viewBoxMatch[2])),
    };
  }

  return null;
}

/**
 * Ensure SVG has proper dimensions set
 */
export function normalizeSvgDimensions(
  svgString: string,
  targetWidth = 1080,
  targetHeight = 1080
): string {
  let normalized = svgString;

  // Add or update width attribute
  if (normalized.includes("width=")) {
    normalized = normalized.replace(
      /width\s*=\s*["'][^"']*["']/i,
      `width="${targetWidth}"`
    );
  } else {
    normalized = normalized.replace("<svg", `<svg width="${targetWidth}"`);
  }

  // Add or update height attribute
  if (normalized.includes("height=")) {
    normalized = normalized.replace(
      /height\s*=\s*["'][^"']*["']/i,
      `height="${targetHeight}"`
    );
  } else {
    normalized = normalized.replace("<svg", `<svg height="${targetHeight}"`);
  }

  // Ensure viewBox is present
  if (!normalized.includes("viewBox")) {
    normalized = normalized.replace(
      "<svg",
      `<svg viewBox="0 0 ${targetWidth} ${targetHeight}"`
    );
  }

  return normalized;
}
