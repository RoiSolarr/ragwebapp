-- CreateTable
-- Backs checkRateLimit() in src/lib/rate-limit.ts, which upserts rows via
-- raw SQL (INSERT ... ON CONFLICT ("key")). The PRIMARY KEY on "key" is
-- what gives Postgres the unique index that ON CONFLICT ("key") requires.
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);