import { beforeEach, expect, test, vi } from "vitest";

import { ContentError } from "@/features/content/domain";

const topicId = "10000000-0000-4000-8000-000000000001";
const mocks = vi.hoisted(() => ({ getAdmin: vi.fn(), listAdmin: vi.fn(), requireAdminPage: vi.fn() }));
vi.mock("@/features/content/service", () => ({ getAdmin: mocks.getAdmin, listAdmin: mocks.listAdmin }));
vi.mock("@/lib/auth/session", () => ({ requireAdminPage: mocks.requireAdminPage }));

import { searchTopicOptionsAction } from "./topic-picker-actions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdminPage.mockResolvedValue({});
  mocks.listAdmin.mockResolvedValue({
    items: [{ id: topicId, title: "Vas Deferens & Vasectomy", organSystemName: "Reproductive" }],
    pagination: { page: 2, pageSize: 12, total: 13, totalPages: 2 },
  });
});

test("loads a bounded, title-sorted topic page and hydrates the current selection", async () => {
  mocks.getAdmin.mockResolvedValue({ id: topicId, title: "Vas Deferens & Vasectomy" });

  await expect(searchTopicOptionsAction({ page: 2, search: " vas ", selectedId: topicId })).resolves.toEqual({
    items: [{ id: topicId, title: "Vas Deferens & Vasectomy", organSystemName: "Reproductive" }],
    pagination: { page: 2, pageSize: 12, total: 13, totalPages: 2 },
    selected: { id: topicId, title: "Vas Deferens & Vasectomy" },
  });

  expect(mocks.requireAdminPage).toHaveBeenCalledOnce();
  expect(mocks.listAdmin).toHaveBeenCalledWith("topic", { page: 2, pageSize: 12, q: "vas", sortBy: "title", sortOrder: "asc" });
  expect(mocks.getAdmin).toHaveBeenCalledWith("topic", topicId);
});

test("only treats an inaccessible previous selection as absent", async () => {
  mocks.getAdmin.mockRejectedValue(new ContentError("NOT_FOUND", "Content was not found.", 404));

  await expect(searchTopicOptionsAction({ page: 1, search: "", selectedId: topicId })).resolves.toMatchObject({ selected: null });
});
