import { PublishStatus, type Prisma, type PrismaClient } from "@prisma/client";

import { assertCanonicalSeed, type CanonicalSeedPlan } from "./seed-data";

type DemoUpdateManyArgs = {
  where: { id: { in: string[] } };
  data: { status: PublishStatus; isActive?: boolean };
};

type DemoUpdateDelegate = {
  updateMany(args: DemoUpdateManyArgs): PromiseLike<{ count: number }>;
};

export type DemoPublicationStore = {
  organSystem: DemoUpdateDelegate;
  topic: DemoUpdateDelegate;
  contentLesson: DemoUpdateDelegate;
  flashcard: DemoUpdateDelegate;
  question: DemoUpdateDelegate;
};

async function publishRecords(
  resource: string,
  delegate: DemoUpdateDelegate,
  ids: string[],
  data: DemoUpdateManyArgs["data"],
) {
  const result = await delegate.updateMany({ where: { id: { in: ids } }, data });
  if (result.count !== ids.length) {
    throw new Error(`Canonical demo publication failed for ${resource}: expected ${ids.length}, found ${result.count}.`);
  }
}

export async function publishCanonicalDemo(store: DemoPublicationStore, plan: CanonicalSeedPlan): Promise<void> {
  assertCanonicalSeed(plan);

  await publishRecords(
    "organSystem",
    store.organSystem,
    plan.systems.map(({ id }) => id),
    { status: PublishStatus.PUBLISHED, isActive: true },
  );
  await publishRecords("topic", store.topic, plan.topics.map(({ id }) => id), { status: PublishStatus.PUBLISHED });
  await publishRecords("contentLesson", store.contentLesson, [plan.lesson.id], { status: PublishStatus.PUBLISHED });
  await publishRecords("flashcard", store.flashcard, plan.flashcards.map(({ id }) => id), { status: PublishStatus.PUBLISHED });
  await publishRecords(
    "question",
    store.question,
    plan.questions.map(({ id }) => id),
    { status: PublishStatus.PUBLISHED, isActive: true },
  );
}

export function asDemoPublicationStore(prisma: PrismaClient | Prisma.TransactionClient): DemoPublicationStore {
  return prisma as unknown as DemoPublicationStore;
}
