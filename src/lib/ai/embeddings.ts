import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// text-embedding-004 was shut down by Google on 2026-01-14; gemini-embedding-001
// is the current generally-available replacement.
const EMBEDDING_MODEL = "gemini-embedding-001";

// gemini-embedding-001 defaults to 3072 dimensions. It supports Matryoshka
// truncation via outputDimensionality, so we ask for a smaller, cheaper-to-store
// vector (matches the dimensionality the old text-embedding-004 model produced).
const EMBEDDING_DIMENSIONS = 768;

export type EmbeddingTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export async function getEmbedding(
  text: string,
  taskType: EmbeddingTaskType = "RETRIEVAL_DOCUMENT"
): Promise<number[]> {
  const result = await genAI.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: {
      taskType,
      outputDimensionality: EMBEDDING_DIMENSIONS,
    },
  });
  return result.embeddings?.[0]?.values ?? [];
}