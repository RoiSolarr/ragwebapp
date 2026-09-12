import { prisma } from "@/lib/prisma";

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  const rows = await prisma.$queryRaw<
    Array<{ count: number; resetAt: Date }>
  >`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key")
    DO UPDATE SET
      "count" = CASE
        WHEN "RateLimit"."resetAt" <= NOW() THEN 1
        ELSE "RateLimit"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "RateLimit"."resetAt" <= NOW()
          THEN EXCLUDED."resetAt"
        ELSE "RateLimit"."resetAt"
      END
    RETURNING "count", "resetAt";
  `;

  const entry = rows[0];

  if (!entry) {
    return {
      allowed: false,
      retryAfterSeconds: 60,
    };
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((entry.resetAt.getTime() - Date.now()) / 1000),
  );

  return {
    allowed: entry.count <= limit,
    retryAfterSeconds,
  };
}

export function getRequestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
