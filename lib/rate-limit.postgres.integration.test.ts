import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresRateLimiter, rateLimitKey } from "./rate-limit";

const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)("PostgreSQL rate limiting (dedicated test database)", () => {
  const client = new PrismaClient({ datasourceUrl: url });
  const key = `rate-limit-test:${crypto.randomUUID()}`;
  const limiter = new PostgresRateLimiter(client);

  beforeAll(async () => { await client.$connect(); });
  afterAll(async () => {
    await client.rateLimitBucket.deleteMany({ where: { key: await rateLimitKey("bucket", key) } });
    await client.$disconnect();
  });

  it("atomically limits concurrent requests and resets an expired bucket", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => limiter.check({ key, limit: 5, windowMs: 60_000 })));
    expect(results.filter((result) => result.allowed)).toHaveLength(5);
    await client.rateLimitBucket.update({ where: { key: await rateLimitKey("bucket", key) }, data: { expiresAt: new Date(0) } });
    await expect(limiter.check({ key, limit: 5, windowMs: 60_000 })).resolves.toMatchObject({ allowed: true });
  });
});
