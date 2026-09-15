import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// gemini-1.5-flash was retired in 2025; gemini-3.5-flash is the current
// GA flash model.
const CHAT_MODEL = "gemini-3.5-flash";

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 8000;

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

// Exponential backoff with jitter: attempt 0 -> ~1s, 1 -> ~2s, 2 -> ~4s,
// 3 -> ~8s (capped), each randomized so concurrent requests don't retry
// in lockstep and re-collide against an overloaded model.
function backoffDelay(attempt: number): number {
  const exp = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
  const jitter = Math.random() * exp * 0.5;
  return exp / 2 + jitter;
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
      await wait(backoffDelay(attempt));
    }
  }

  throw lastError;
}