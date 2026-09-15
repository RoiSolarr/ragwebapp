import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// gemini-1.5-flash was retired in 2025; gemini-3.5-flash is the current
// GA flash model.
const CHAT_MODEL = "gemini-3.5-flash";

const MAX_ATTEMPTS = 3;
// Fallback backoff used only when the API response doesn't tell us how
// long to wait (see parseGeminiErrorBody below, which reads the real
// suggested delay off 429 responses).
const DEFAULT_RETRY_DELAYS_MS = [1000, 3000];
// Cap any single wait so a couple of retries can't blow through the
// route's `maxDuration` budget (see route.ts).
const MAX_RETRY_DELAY_MS = 15_000;

/**
 * Thrown when generation ultimately fails because of rate limiting or
 * quota exhaustion, so the route can return something more useful to the
 * caller than a generic 502.
 */
export class RAGGenerationError extends Error {
  constructor(
    message: string,
    // true: worth asking the user to retry shortly. false: won't recover
    // on its own (e.g. a daily quota), so retrying is pointless.
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "RAGGenerationError";
  }
}

function getStatus(error: unknown): number | undefined {
  return (
    (error as { status?: number })?.status ??
    (error as { response?: { status?: number } })?.response?.status
  );
}

// The Gemini API's 429 responses carry their real payload as a JSON string
// in `error.message`, e.g.
//   {"error":{"code":429,"message":"...","status":"RESOURCE_EXHAUSTED","details":[...]}}
// `details` can include a RetryInfo entry (how long to wait before
// retrying) and a QuotaFailure entry (which specific quota was hit). We
// parse both so we can back off for the right amount of time and stop
// retrying a daily quota that has no chance of recovering mid-request.
function parseGeminiErrorBody(
  error: unknown,
): { details?: Array<Record<string, unknown>> } | undefined {
  const raw = (error as { message?: unknown })?.message;

  let body: unknown = raw;
  if (typeof raw === "string") {
    try {
      body = JSON.parse(raw);
    } catch {
      return undefined;
    }
  }

  return (body as { error?: { details?: Array<Record<string, unknown>> } })?.error;
}

function getQuotaInfo(error: unknown): { retryDelayMs?: number; isDailyQuota: boolean } {
  const details = parseGeminiErrorBody(error)?.details ?? [];

  let retryDelayMs: number | undefined;
  let isDailyQuota = false;

  for (const detail of details) {
    if (detail["@type"] === "type.googleapis.com/google.rpc.RetryInfo") {
      const delay = detail.retryDelay;
      if (typeof delay === "string") {
        const seconds = parseFloat(delay.replace(/s$/, ""));
        if (!Number.isNaN(seconds)) retryDelayMs = seconds * 1000;
      }
    }

    if (detail["@type"] === "type.googleapis.com/google.rpc.QuotaFailure") {
      const violations = (detail.violations as Array<{ quotaId?: string }> | undefined) ?? [];
      if (violations.some((violation) => violation.quotaId?.includes("PerDay"))) {
        isDailyQuota = true;
      }
    }
  }

  return { retryDelayMs, isDailyQuota };
}

function isPermanentError(error: unknown): boolean {
  const status = getStatus(error);

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

      if (isPermanentError(error)) {
        throw error;
      }

      const status = getStatus(error);
      const isLastAttempt = attempt === MAX_ATTEMPTS - 1;

      if (status === 429) {
        const { retryDelayMs, isDailyQuota } = getQuotaInfo(error);

        // A day-level quota won't reset during this request, so retrying
        // (and burning the function's time budget) can't help.
        if (isDailyQuota) {
          throw new RAGGenerationError(
            "The AI service's daily usage limit has been reached. Please try again tomorrow, or upgrade the Gemini API plan.",
            false,
          );
        }

        if (isLastAttempt) {
          throw new RAGGenerationError(
            "The AI service is receiving too many requests right now. Please try again in a minute.",
            true,
          );
        }

        const delay = Math.min(
          retryDelayMs ?? DEFAULT_RETRY_DELAYS_MS[attempt] ?? 3000,
          MAX_RETRY_DELAY_MS,
        );
        console.warn(
          `generateRAGAnswer attempt ${attempt + 1} was rate-limited, retrying in ${delay}ms...`,
          error,
        );
        await wait(delay);
        continue;
      }

      if (isLastAttempt) {
        throw error;
      }

      console.warn(`generateRAGAnswer attempt ${attempt + 1} failed, retrying...`, error);
      await wait(DEFAULT_RETRY_DELAYS_MS[attempt] ?? 1500);
    }
  }

  throw lastError;
}