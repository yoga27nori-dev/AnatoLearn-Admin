"use server";

import { getAdmin, listAdmin } from "@/features/content/service";
import { ContentError } from "@/features/content/domain";
import { topicPickerQuerySchema } from "@/features/content/schemas";
import { requireAdminPage } from "@/lib/auth/session";

export async function searchTopicOptionsAction(input: unknown) {
  await requireAdminPage();

  const parsed = topicPickerQuerySchema.safeParse(input);
  const query = parsed.success ? parsed.data : { page: 1, search: "", selectedId: undefined };
  const result = await listAdmin("topic", {
    page: query.page,
    pageSize: 12,
    q: query.search || undefined,
    sortBy: "title",
    sortOrder: "asc",
  });

  let selected: { id: string; title: string } | null = null;
  if (query.selectedId) {
    try {
      const topic = await getAdmin("topic", query.selectedId);
      selected = { id: topic.id, title: topic.title };
    } catch (error) {
      if (error instanceof ContentError && error.code === "NOT_FOUND") selected = null;
      else throw error;
    }
  }

  return {
    items: result.items.map((topic) => ({ id: topic.id, title: topic.title, organSystemName: topic.organSystemName })),
    pagination: result.pagination,
    selected,
  };
}
