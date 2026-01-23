import pdfParse from "pdf-parse";

export interface ParsedPdfResult {
  text: string;
  numPages: number;
  info: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
  };
}

/**
 * Parse PDF buffer and extract text content
 */
export async function parsePdf(buffer: Buffer): Promise<ParsedPdfResult> {
  const data = await pdfParse(buffer);

  return {
    text: data.text,
    numPages: data.numpages,
    info: {
      title: data.info?.Title,
      author: data.info?.Author,
      subject: data.info?.Subject,
      keywords: data.info?.Keywords,
    },
  };
}
