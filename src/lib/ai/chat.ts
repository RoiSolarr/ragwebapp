import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Requests-per-day (RPD) quotas are enforced *per model*, so when one model's
// daily allowance is gone the next one in this list usually still has room.
// Order: best model first, cheapest / highest-quota model last.
// Bump these as Google ships new Flash generations and retires old ones.
const CHAT_MODELS = ["gemini-3.5-flash", "gemini-3.5-flash-lite"];

const MAX_ATTEMPTS_PER_MODEL = 3;
// Fallback backoff used only when the API response doesn't tell us how
// long to wait (see parseGeminiErrorBody below, which reads the real
// suggested delay off 429 responses).
const DEFAULT_RETRY_DELAYS_MS = [1000, 3000];
// Cap any single wait so a couple of retries can't blow through the
// route's `maxDuration` budget (see route.ts).
const MAX_RETRY_DELAY_MS = 15_000;
// Whole-call wall-clock budget. route.ts sets maxDuration = 60 and auth,
// embedding and retrieval have already spent part of it, so we stop
// retrying well before the platform kills the function.
const TOTAL_GENERATION_BUDGET_MS = 40_000;
// Rough room to leave for one more generateContent call after a sleep.
const MIN_REQUEST_TIME_MS = 5_000;

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
    // Best guess at how long the caller should wait, in seconds. Surfaced
    // as a Retry-After header by the route.
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "RAGGenerationError";
  }
}

type GeminiErrorBody = {
  code?: number;
  status?: string;
  message?: string;
  details?: Array<Record<string, unknown>>;
};

// google.rpc.Code names the SDK sometimes reports in `error.status` instead
// of a numeric HTTP status.
const RPC_STATUS_TO_HTTP: Record<string, number> = {
  INVALID_ARGUMENT: 400,
  UNAUTHENTICATED: 401,
  PERMISSION_DENIED: 403,
  NOT_FOUND: 404,
  RESOURCE_EXHAUSTED: 429,
  INTERNAL: 500,
  UNAVAILABLE: 503,
  DEADLINE_EXCEEDED: 504,
};

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    // Some SDK versions prefix the body, e.g.
    // `got status: 429 RESOURCE_EXHAUSTED. {"error":{...}}`
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end <= start) return undefined;
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch {
      return undefined;
    }
  }
}

// The Gemini API's 429 responses carry their real payload as a JSON string
// in `error.message`, e.g.
//   {"error":{"code":429,"message":"...","status":"RESOURCE_EXHAUSTED","details":[...]}}
// `details` can include a RetryInfo entry (how long to wait before
// retrying) and a QuotaFailure entry (which specific quota was hit). We
// parse both so we can back off for the right amount of time and stop
// retrying a daily quota that has no chance of recovering mid-request.
function parseGeminiErrorBody(error: unknown): GeminiErrorBody | undefined {
  const raw = (error as { message?: unknown })?.message;

  let body: unknown = raw;
  if (typeof raw === "string") {
    body = tryParseJson(raw);
  }

  if (!body || typeof body !== "object") return undefined;

  const nested = (body as { error?: unknown }).error;
  if (nested && typeof nested === "object") return nested as GeminiErrorBody;

  const candidate = body as GeminiErrorBody;
  if (candidate.code !== undefined || candidate.details !== undefined || candidate.status !== undefined) {
    return candidate;
  }

  return undefined;
}

function getStatus(error: unknown): number | undefined {
  const direct =
    (error as { status?: unknown })?.status ??
    (error as { response?: { status?: unknown } })?.response?.status;

  if (typeof direct === "number") return direct;

  // The SDK doesn't always set a numeric status; the real code lives in the
  // JSON body. Without this, a 429 can fall through to the generic retry
  // branch and surface as an unhelpful 502.
  const body = parseGeminiErrorBody(error);
  if (typeof body?.code === "number") return body.code;
  if (typeof body?.status === "string" && RPC_STATUS_TO_HTTP[body.status]) {
    return RPC_STATUS_TO_HTTP[body.status];
  }

  if (typeof direct === "string") {
    const numeric = Number(direct);
    if (!Number.isNaN(numeric)) return numeric;
    return RPC_STATUS_TO_HTTP[direct];
  }

  return undefined;
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

// Sleeps only if there's still enough of the budget left to attempt another
// request afterwards. Returns false when we've run out of time.
async function waitWithinBudget(delayMs: number, deadline: number): Promise<boolean> {
  const remaining = deadline - Date.now();
  if (delayMs + MIN_REQUEST_TIME_MS > remaining) return false;
  await wait(delayMs);
  return true;
}

// Gemini RPD quotas reset at midnight US Pacific, not at the caller's local
// midnight, so "try again tomorrow" is often wrong by many hours.
// Approximate (ignores the DST transition day), which is fine for a hint.
function secondsUntilPacificMidnight(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const hour = read("hour") % 24;
  const elapsed = hour * 3600 + read("minute") * 60 + read("second");

  return Math.max(60, 86_400 - elapsed);
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}

export async function generateRAGAnswer(query: string, context: string) {
  const deadline = Date.now() + TOTAL_GENERATION_BUDGET_MS;

  let lastError: unknown;
  // Remembered so that if *every* model is out of daily quota we report that
  // rather than whatever the last model happened to fail with.
  let dailyQuotaError: RAGGenerationError | undefined;

  for (let modelIndex = 0; modelIndex < CHAT_MODELS.length; modelIndex++) {
    const model = CHAT_MODELS[modelIndex];
    const hasFallbackModel = modelIndex < CHAT_MODELS.length - 1;

    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_MODEL; attempt++) {
      if (Date.now() >= deadline - MIN_REQUEST_TIME_MS) break;

      try {
        const result = await genAI.models.generateContent({
          model,
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

        const status = getStatus(error);
        const isLastAttempt = attempt === MAX_ATTEMPTS_PER_MODEL - 1;

        // Model retired, renamed, or not enabled for this key. Retrying the
        // same name can't help, but the next model in the list might work.
        if (status === 404) {
          console.warn(`Chat model "${model}" is unavailable (404). Trying the next model...`, error);
          break;
        }

        if (status === 429) {
          const { retryDelayMs, isDailyQuota } = getQuotaInfo(error);

          if (isDailyQuota) {
            const resetIn = secondsUntilPacificMidnight();
            dailyQuotaError = new RAGGenerationError(
              `The AI service has hit its daily request limit. Free-tier quotas reset at midnight US Pacific time (about ${formatDuration(resetIn)} from now). Upgrading the Gemini API plan removes this limit.`,
              false,
              resetIn,
            );
            // Daily quotas are per model, so fall through to the next one.
            console.warn(`Chat model "${model}" is out of daily quota. Trying the next model...`);
            break;
          }

          const delay = Math.min(
            retryDelayMs ?? DEFAULT_RETRY_DELAYS_MS[attempt] ?? 3000,
            MAX_RETRY_DELAY_MS,
          );

          if (isLastAttempt) {
            if (hasFallbackModel) break;
            throw new RAGGenerationError(
              "The AI service is receiving too many requests right now. Please try again in a minute.",
              true,
              Math.max(1, Math.ceil(delay / 1000)),
            );
          }

          console.warn(
            `generateRAGAnswer (${model}) attempt ${attempt + 1} was rate-limited, retrying in ${delay}ms...`,
            error,
          );

          if (!(await waitWithinBudget(delay, deadline))) {
            if (hasFallbackModel) break;
            throw new RAGGenerationError(
              "The AI service is receiving too many requests right now. Please try again in a minute.",
              true,
              Math.max(1, Math.ceil(delay / 1000)),
            );
          }
          continue;
        }

        // 400 / 401 / 403 etc. — a bad key or a malformed request won't be
        // fixed by another model or another attempt.
        if (isPermanentError(error)) {
          throw error;
        }

        if (isLastAttempt) {
          if (hasFallbackModel) break;
          throw error;
        }

        console.warn(`generateRAGAnswer (${model}) attempt ${attempt + 1} failed, retrying...`, error);
        if (!(await waitWithinBudget(DEFAULT_RETRY_DELAYS_MS[attempt] ?? 1500, deadline))) {
          if (hasFallbackModel) break;
          throw error;
        }
      }
    }
  }

  if (dailyQuotaError) throw dailyQuotaError;
  throw lastError;
}