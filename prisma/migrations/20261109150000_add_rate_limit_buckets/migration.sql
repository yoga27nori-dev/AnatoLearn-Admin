CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");
ALTER TABLE "RateLimitBucket" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "RateLimitBucket" FROM PUBLIC, anon, authenticated;
