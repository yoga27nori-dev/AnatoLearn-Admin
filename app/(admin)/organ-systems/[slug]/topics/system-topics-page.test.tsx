import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

const systemId = "10000000-0000-4000-8000-000000000001";
const topicId = "20000000-0000-4000-8000-000000000001";
const mocks = vi.hoisted(() => ({
  getAdminBySlug: vi.fn(),
  getAdminMediaMap: vi.fn(),
  listAdmin: vi.fn(),
}));

vi.mock("@/components/phase3/data", () => ({ getAdminBySlug: mocks.getAdminBySlug, listAdmin: mocks.listAdmin }));
vi.mock("@/features/media/service", () => ({ getAdminMediaMap: mocks.getAdminMediaMap }));
vi.mock("@/components/app-shell/page-header", () => ({ PageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("@/components/media/admin-media-thumbnail", () => ({ AdminMediaThumbnail: () => null }));
vi.mock("@/components/phase3/resource-forms", () => ({ TopicForm: () => null }));
vi.mock("@/components/phase3/admin-ui", () => ({
  FilterBar: ({ children }: { children: React.ReactNode }) => <form>{children}</form>,
  ResourceCard: ({ title }: { title: string }) => <article>{title}</article>,
  ResourceCards: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  StatusBadge: () => null,
  fieldClass: "field",
}));
vi.mock("@/components/shared/empty-state", () => ({ EmptyState: () => null }));
vi.mock("@/components/shared/pagination", () => ({ Pagination: ({ page, pageCount }: { page: number; pageCount: number }) => <p>{`Page ${page} of ${pageCount}`}</p> }));
vi.mock("../../../phase3-actions", () => ({ createScopedTopicResource: vi.fn() }));

import SystemTopicsPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAdminBySlug.mockResolvedValue({ id: systemId, name: "Reproductive", slug: "reproductive" });
  mocks.listAdmin.mockResolvedValue({
    items: [{
      id: topicId,
      title: "Vas Deferens & Vasectomy",
      slug: "vas-deferens-vasectomy",
      summary: null,
      coverImageUrl: null,
      coverMediaId: null,
      status: "DRAFT",
    }],
    pagination: { page: 2, pageSize: 15, total: 16, totalPages: 2 },
  });
  mocks.getAdminMediaMap.mockResolvedValue(new Map());
});

test("uses the scoped system with search, status, and pagination instead of a capped first page", async () => {
  render(await SystemTopicsPage({
    params: Promise.resolve({ slug: "reproductive" }),
    searchParams: Promise.resolve({ page: "2", q: "vas", status: "DRAFT" }),
  }));

  expect(mocks.listAdmin).toHaveBeenCalledWith("topic", {
    page: 2,
    pageSize: 15,
    q: "vas",
    status: "DRAFT",
    organSystemId: systemId,
    sortBy: "displayOrder",
    sortOrder: "asc",
  });
  expect(screen.getByText("Vas Deferens & Vasectomy")).toBeInTheDocument();
  expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
});
