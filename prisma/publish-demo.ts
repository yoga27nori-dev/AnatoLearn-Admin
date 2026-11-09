import { PrismaClient } from "@prisma/client";

import { asDemoPublicationStore, publishCanonicalDemo } from "./demo-publication";
import { createCanonicalSeedPlan } from "./seed-data";
import { asSeedStore, installCanonicalSeed } from "./seed-service";

const prisma = new PrismaClient();

async function main() {
  const plan = createCanonicalSeedPlan();
  await prisma.$transaction(async (transaction) => {
    await installCanonicalSeed(asSeedStore(transaction), plan);
    await publishCanonicalDemo(asDemoPublicationStore(transaction), plan);
  }, { timeout: 60_000 });

  console.log("Demo publication completed: canonical sample content is learner-visible and marked for academic review.");
}

main()
  .catch(() => {
    console.error("Demo publication failed without exposing database credentials.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
