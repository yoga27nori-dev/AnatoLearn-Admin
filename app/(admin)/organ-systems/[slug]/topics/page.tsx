import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { AdminMediaThumbnail } from "@/components/media/admin-media-thumbnail";
import { FilterBar, ResourceCard, ResourceCards, StatusBadge, fieldClass } from "@/components/phase3/admin-ui";
import { getAdminBySlug, listAdmin } from "@/components/phase3/data";
import { TopicForm } from "@/components/phase3/resource-forms";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { listQuerySchema } from "@/features/content/schemas";
import { getAdminMediaMap } from "@/features/media/service";
import { createScopedTopicResource } from "../../../phase3-actions";

export default async function SystemTopicsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const paramsQuery = await searchParams;
  let system;
  try {
    system = await getAdminBySlug("organSystem", slug);
  } catch {
    notFound();
  }
  const parsed = listQuerySchema.safeParse({ page: paramsQuery.page, pageSize: 15, q: paramsQuery.q || undefined, status: paramsQuery.status || undefined, organSystemId: system.id, sortBy: "displayOrder", sortOrder: "asc" });
  const input = parsed.success ? parsed.data : listQuerySchema.parse({ pageSize: 15, organSystemId: system.id, sortBy: "displayOrder", sortOrder: "asc" });
  const result = await listAdmin("topic", input);
  const media = await getAdminMediaMap(result.items.flatMap((item) => item.coverMediaId ? [item.coverMediaId] : []));

  return <>
    <PageHeader description={`Search, filter, create, and review topics belonging to ${system.name}.`} eyebrow="Organ systems" title={`${system.name} topics`} />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.7fr)]">
      <section>
        <h2 className="mb-3 text-lg font-bold">Existing topics</h2>
        <FilterBar defaultValue={input.q} placeholder="Search this system's topics">
          <select aria-label="Status" className={fieldClass} defaultValue={input.status ?? ""} name="status"><option value="">All statuses</option><option>DRAFT</option><option>PUBLISHED</option><option>ARCHIVED</option></select>
        </FilterBar>
        {result.items.length ? <>
          <ResourceCards>{result.items.map((item) => <ResourceCard actions={<StatusBadge status={item.status} />} href={`/organ-systems/${system.slug}/topics/${item.slug}`} key={item.id} title={item.title}><AdminMediaThumbnail attached={Boolean(item.coverMediaId)} label="Cover" legacyUrl={item.coverImageUrl} media={item.coverMediaId ? media.get(item.coverMediaId) : undefined} /><p className="mt-3">{item.summary || "No summary yet."}</p></ResourceCard>)}</ResourceCards>
          <div className="mt-5"><Pagination page={result.pagination.page} pageCount={Math.max(1, result.pagination.totalPages)} pathname={`/organ-systems/${system.slug}/topics`} /></div>
        </> : <EmptyState description={`No topics match the current search and filters for ${system.name}. Use the form to add a topic or adjust the filters.`} title="No topics found" />}
      </section>
      <section><h2 className="mb-3 text-lg font-bold">Add topic</h2><TopicForm action={createScopedTopicResource.bind(null, system.slug)} systems={[{ id: system.id, label: system.name }]} /></section>
    </div>
  </>;
}
