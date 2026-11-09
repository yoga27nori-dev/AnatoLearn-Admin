import { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { PostgresRateLimiter, rateLimitKey } from "./rate-limit";

describe.skipIf(process.env.RUN_RATE_LIMIT_ROLLBACK_TEST !== "1")("PostgreSQL rate limiter rollback check", () => {
  it("increments, blocks, and resets without persisting test data", async () => {
    const client = new PrismaClient();
    const marker = new Error("rollback test transaction");
    vi.spyOn(Math, "random").mockReturnValue(1);
    try {
      const security = await client.$queryRaw<{ rls: boolean; anon: boolean; authenticated: boolean }[]>`
        SELECT c.relrowsecurity AS rls,
          has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE') AS anon,
          has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE') AS authenticated
        FROM pg_class c WHERE c.oid = '"RateLimitBucket"'::regclass`;
      expect(security[0]).toEqual({ rls: true, anon: false, authenticated: false });
      await expect(client.$transaction(async (tx) => {
        const limiter = new PostgresRateLimiter(tx);
        const key = `test:${crypto.randomUUID()}`;
        const input = { key, limit: 2, windowMs: 60_000 };
        expect((await limiter.check(input)).allowed).toBe(true);
        expect((await limiter.check(input)).allowed).toBe(true);
        expect((await limiter.check(input)).allowed).toBe(false);
        await tx.rateLimitBucket.update({ where: { key: await rateLimitKey("bucket", key) }, data: { expiresAt: new Date(0) } });
        expect((await limiter.check(input)).allowed).toBe(true);
        throw marker;
      })).rejects.toBe(marker);
    } finally {
      vi.restoreAllMocks();
      await client.$disconnect();
    }
  });
});
