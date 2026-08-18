import { notFound } from "next/navigation";
import { Send, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import { InlineAction } from "@/components/phase3/action-form";
import { StatusBadge } from "@/components/phase3/admin-ui";
import { getAdminBySlug } from "@/components/phase3/data";
import { OrganSystemForm } from "@/components/phase3/resource-forms";
import { getAdminMediaMap } from "@/features/media/service";
import { changeResourceStatus, trashResourceAction, updateResource } from "../../phase3-actions";

export default async function OrganSystemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let item;
  try {
    item = await getAdminBySlug("organSystem", slug);
  } catch {
    notFound();
  }
  const media = await getAdminMediaMap([item.coverMediaId, item.iconMediaId].filter((id): id is string => Boolean(id)));
  return <>
    <PageHeader action={<div aria-label="Organ system actions" className="flex flex-wrap items-center justify-end gap-2" role="group"><StatusBadge status={item.status} />{item.status === "DRAFT" && <InlineAction action={changeResourceStatus.bind(null, "organSystem", item.id, "PUBLISHED")} ariaLabel={`Publish ${item.name}`}><Send aria-hidden className="size-4" />Publish</InlineAction>}{item.status !== "ARCHIVED" && <InlineAction action={trashResourceAction.bind(null, "organ-system", item.id)} ariaLabel={`Delete ${item.name}`} confirmMessage="This hides the organ system and its descendants from normal views. It can be restored from Settings > Trash for 30 days. Continue?" variant="destructiveOutline"><Trash2 aria-hidden className="size-4" />Delete</InlineAction>}</div>} description={`Edit metadata and control publication. Slug: ${item.slug}.`} eyebrow="Organ systems" title={item.name} />
    <OrganSystemForm action={updateResource.bind(null, "organSystem", item.id)} coverMedia={item.coverMediaId ? media.get(item.coverMediaId) : undefined} iconMedia={item.iconMediaId ? media.get(item.iconMediaId) : undefined} item={item} />
  </>;
}
