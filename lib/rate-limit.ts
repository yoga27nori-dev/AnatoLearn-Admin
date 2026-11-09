import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type Entry = { count: number; resetsAt: number };
export type RateLimitInput = { key: string; limit: number; windowMs: number };
export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };
export interface RateLimiter { check(input: RateLimitInput): Promise<RateLimitResult> }

export const PROCESS_LOCAL_RATE_LIMIT_MAX_KEYS = 10_000;
const SWEEP_INTERVAL = 256;

export class MemoryRateLimiter implements RateLimiter {
  private entries = new Map<string, Entry>();
  private newKeysSinceSweep = 0;

  private makeRoom(now: number) {
    for (const [key, entry] of this.entries) if (entry.resetsAt <= now) this.entries.delete(key);
    while (this.entries.size >= PROCESS_LOCAL_RATE_LIMIT_MAX_KEYS) {
      const oldestKey = this.entries.keys().next().value;
      if (typeof oldestKey !== "string") break;
      this.entries.delete(oldestKey);
    }
  }

  async check({ key, limit, windowMs }: RateLimitInput): Promise<RateLimitResult> {
    const now = Date.now();
    const current = this.entries.get(key);
    if (!current || current.resetsAt <= now) {
      if (!current) {
        this.newKeysSinceSweep += 1;
        if (this.newKeysSinceSweep >= SWEEP_INTERVAL || this.entries.size >= PROCESS_LOCAL_RATE_LIMIT_MAX_KEYS) {
          this.makeRoom(now);
          this.newKeysSinceSweep = 0;
        }
      }
      this.entries.set(key, { count: 1, resetsAt: now + windowMs });
      return { allowed: true, retryAfterSeconds: Math.ceil(windowMs / 1000) };
    }
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetsAt - now) / 1000));
    if (current.count >= limit) return { allowed: false, retryAfterSeconds };
    current.count += 1;
    return { allowed: true, retryAfterSeconds };
  }
}

export class PostgresRateLimiter implements RateLimiter {
  constructor(private db: Pick<PrismaClient, "$queryRaw" | "$executeRaw"> = prisma) {}

  async check({ key, limit, windowMs }: RateLimitInput): Promise<RateLimitResult> {
    const opaqueKey = await rateLimitKey("bucket", key);
    if (Math.random() < 0.01) {
      await this.db.$executeRaw`DELETE FROM "RateLimitBucket" WHERE "key" IN (
        SELECT "key" FROM "RateLimitBucket" WHERE "expiresAt" <= statement_timestamp()
        ORDER BY "expiresAt" LIMIT 100
      ) AND "expiresAt" <= statement_timestamp()`;
    }
    const rows = await this.db.$queryRaw<{ count: number; retryAfterSeconds: number }[]>`
      INSERT INTO "RateLimitBucket" ("key", "count", "expiresAt")
      VALUES (${opaqueKey}, 1, statement_timestamp() + ${windowMs} * interval '1 millisecond')
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimitBucket"."expiresAt" <= statement_timestamp()
          THEN 1 ELSE LEAST("RateLimitBucket"."count" + 1, ${limit + 1}) END,
        "expiresAt" = CASE WHEN "RateLimitBucket"."expiresAt" <= statement_timestamp()
          THEN statement_timestamp() + ${windowMs} * interval '1 millisecond'
          ELSE "RateLimitBucket"."expiresAt" END
      RETURNING "count", GREATEST(1, CEIL(EXTRACT(EPOCH FROM ("expiresAt" - statement_timestamp()))))::integer AS "retryAfterSeconds"
    `;
    const result = rows[0];
    if (!result) throw new Error("Rate limiter returned no result.");
    return {
      allowed: result.count <= limit,
      retryAfterSeconds: result.retryAfterSeconds,
    };
  }
}

const memoryLimiter = new MemoryRateLimiter();
const postgresLimiter = new PostgresRateLimiter();

export function getRateLimiter(): RateLimiter {
  return process.env.NODE_ENV === "production" ? postgresLimiter : memoryLimiter;
}

export async function rateLimitKey(namespace: string, identifier: string) {
  const normalized = identifier.trim().toLowerCase();
  const bytes = new TextEncoder().encode(`${namespace}:${normalized}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `${namespace}:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export async function checkRateLimit(namespace: string, identifier: string, limit: number, windowMs = 60_000) {
  try {
    return await getRateLimiter().check({ key: await rateLimitKey(namespace, identifier), limit, windowMs });
  } catch {
    return { allowed: false, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }
}

export function trustedClientIdentifier(headers: Headers, isVercel = Boolean(process.env.VERCEL)) {
  if (!isVercel) return "unattributed";
  const address = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  return address ? address.slice(0, 128) : "unattributed";
}

export async function checkAuthRateLimits({
  namespace,
  accountIdentifier,
  clientIdentifier,
  clientLimit,
  accountLimit,
  windowMs = 60_000,
  limiter = getRateLimiter(),
}: {
  namespace: string;
  accountIdentifier: string;
  clientIdentifier: string;
  clientLimit: number;
  accountLimit: number;
  windowMs?: number;
  limiter?: RateLimiter;
}): Promise<RateLimitResult> {
  try {
    const client = await limiter.check({
      key: await rateLimitKey(`${namespace}:client`, clientIdentifier),
      limit: clientLimit,
      windowMs,
    });
    if (!client.allowed) return client;
    return await limiter.check({
      key: await rateLimitKey(`${namespace}:account`, accountIdentifier),
      limit: accountLimit,
      windowMs,
    });
  } catch {
    return { allowed: false, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }
}

// Compatibility for authenticated routes already using server-derived opaque IDs.
export async function allowRequest(key: string, limit = 10, windowMs = 60_000) {
  try {
    return (await getRateLimiter().check({ key, limit, windowMs })).allowed;
  } catch {
    return false;
  }
}
