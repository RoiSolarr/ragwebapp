import 'pdf-parse/worker';
import { PDFParse } from "pdf-parse";

export type DocumentType = "application/pdf" | "text/plain" | "text/markdown";

const MARKDOWN_EXTENSIONS = new Set(["md", "markdown"]);
const PLAIN_TEXT_EXTENSIONS = new Set(["txt"]);

/**
 * Figures out which of our supported document types a file is, using both
 * the browser-reported mime type and the file extension (browsers are
 * inconsistent about reporting a mime type for .md/.txt files).
 */
export function resolveDocumentType(fileName: string, mimeType: string): DocumentType | null {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (mimeType === "application/pdf" || extension === "pdf") return "application/pdf";
  if (mimeType === "text/markdown" || mimeType === "text/x-markdown" || MARKDOWN_EXTENSIONS.has(extension)) return "text/markdown";
  if (mimeType === "text/plain" || PLAIN_TEXT_EXTENSIONS.has(extension)) return "text/plain";

  return null;
}

export function validateDocumentBuffer(buffer: Buffer, documentType: DocumentType) {
  if (documentType === "application/pdf") {
    return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  }

  // Text documents must not contain binary NUL bytes. This also prevents
  // arbitrary binary data from being indexed as misleading text.
  return !buffer.includes(0);
}

export async function extractText(buffer: Buffer, documentType: DocumentType): Promise<string> {
  if (documentType === "application/pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text ?? "";
    } finally {
      await parser.destroy();
    }
  }

  return buffer.toString("utf-8");
}
