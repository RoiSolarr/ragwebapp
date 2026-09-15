import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// gemini-1.5-flash was retired in 2025; gemini-3.5-flash is the current
// GA flash model.
const CHAT_MODEL = "gemini-3.5-flash";

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [500, 1500];

function isPermanentError(error: unknown): boolean {
  const status =
    (error as { status?: number })?.status ??
    (error as { response?: { status?: number } })?.response?.status;

  // Client errors other than 429 (rate limit) won't succeed on retry.
  return typeof status === "number" && status >= 400 && status < 500 && status !== 429;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateRAGAnswer(query: string, context: string) {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const result = await genAI.models.generateContent({
        model: CHAT_MODEL,
        contents: `Context:\n${context}\n\nQuestion: ${query}`,
        config: {
          systemInstruction:
            "Answer the question using ONLY the numbered sources given in the context. " +
            "Cite the source for every claim by putting its bracketed number, e.g. [1], " +
            "immediately after the sentence it supports. If the sources don't contain " +
            "the answer, say so plainly instead of guessing.",
        },
      });
      return result.text ?? "";
    } catch (error) {
      lastError = error;

      if (isPermanentError(error) || attempt === MAX_ATTEMPTS - 1) {
        throw error;
      }

      console.warn(`generateRAGAnswer attempt ${attempt + 1} failed, retrying...`, error);
      await wait(RETRY_DELAYS_MS[attempt]);
    }
  }

  throw lastError;
}