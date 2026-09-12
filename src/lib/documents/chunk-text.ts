const MAX_CHUNK_CHARS = 1200;
const HARD_SPLIT_OVERLAP_CHARS = 150;

/**
 * Splits text into chunks suitable for embedding. Groups whole paragraphs
 * together up to MAX_CHUNK_CHARS so chunks stay coherent; a single paragraph
 * longer than that is hard-split with a small overlap so context isn't lost
 * at the boundary.
 */
export function chunkText(rawText: string): string[] {
  const text = rawText.replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;

    if (candidate.length <= MAX_CHUNK_CHARS) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = "";
    }

    if (paragraph.length <= MAX_CHUNK_CHARS) {
      current = paragraph;
      continue;
    }

    let start = 0;
    while (start < paragraph.length) {
      const end = Math.min(start + MAX_CHUNK_CHARS, paragraph.length);
      chunks.push(paragraph.slice(start, end));
      if (end === paragraph.length) break;
      start = end - HARD_SPLIT_OVERLAP_CHARS;
    }
  }

  if (current) chunks.push(current);

  return chunks;
}