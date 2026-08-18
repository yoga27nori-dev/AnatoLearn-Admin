"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { searchTopicOptionsAction } from "@/app/(admin)/topic-picker-actions";
import { fieldClass } from "@/components/phase3/admin-ui";
import { Button } from "@/components/ui/button";

type TopicOption = { id: string; title: string; organSystemName: string };
type Result = {
  items: TopicOption[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  selected: { id: string; title: string } | null;
};

export function TopicPicker({ initialLabel, label, name, required = true, value = "" }: { initialLabel?: string | null; label: string; name: string; required?: boolean; value?: string | null }) {
  const [selectedId, setSelectedId] = useState(value ?? "");
  const [selectedLabel, setSelectedLabel] = useState(initialLabel ?? "");
  const [result, setResult] = useState<Result>({ items: [], pagination: { page: 1, pageSize: 12, total: 0, totalPages: 0 }, selected: null });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(false);
  const requestId = useRef(0);
  const descriptionId = `${name}-topic-description`;

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    inputRef.current?.dispatchEvent(new Event("change", { bubbles: true }));
  }, [selectedId]);

  const load = (page: number, query = search) => startTransition(async () => {
    const currentRequest = ++requestId.current;
    try {
      const next = await searchTopicOptionsAction({ page, search: query, ...(selectedId ? { selectedId } : {}) });
      if (currentRequest !== requestId.current) return;
      setResult(next);
      if (next.selected?.id === selectedId) setSelectedLabel(next.selected.title);
      setError("");
    } catch {
      if (currentRequest !== requestId.current) return;
      setError("Topics could not be loaded. Try again.");
    }
  });

  const choose = (topic: TopicOption) => {
    setSelectedId(topic.id);
    setSelectedLabel(topic.title);
    setOpen(false);
  };

  return <div className="grid gap-2">
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><span className="text-sm font-semibold text-body">{label} <span className="font-normal text-muted">{required ? "Required" : "Optional"}</span></span>{selectedId ? <span className="text-xs font-medium text-success">Selected</span> : null}</div>
    <input name={name} ref={inputRef} type="hidden" value={selectedId} />
    {selectedId ? <div className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary-soft px-3 py-2"><div className="min-w-0"><p className="truncate text-sm font-bold text-foreground">{selectedLabel || (required ? "Current topic selected" : "Topic filter active")}</p><p className="text-xs text-muted">Use the picker to search or change this topic.</p></div><div className="flex shrink-0 gap-3"><button aria-label={`Change ${label}`} className="text-sm font-semibold text-primary hover:text-primary-hover" onClick={() => setOpen(true)} type="button">Change</button>{!required ? <button aria-label={`Clear ${label}`} className="text-sm font-semibold text-muted hover:text-foreground" onClick={() => { setSelectedId(""); setSelectedLabel(""); }} type="button">Clear</button> : null}</div></div> : <p className="text-sm text-muted" id={descriptionId}>{required ? "Select the curriculum topic for this item." : "Optionally narrow results to one curriculum topic."}</p>}
    <Dialog.Root onOpenChange={(next) => {
      setOpen(next);
      if (next) {
        setSearch("");
        load(1, "");
      }
    }} open={open}>
      <Dialog.Trigger asChild><Button aria-describedby={selectedId ? undefined : descriptionId} className="w-full sm:w-fit" type="button" variant="outline">Choose topic</Button></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/40" />
        <Dialog.Content className="fixed inset-x-4 top-1/2 z-50 max-h-[85vh] -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-xl sm:left-1/2 sm:w-[min(720px,calc(100%-2rem))] sm:-translate-x-1/2 sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><Dialog.Title className="text-xl font-bold">Choose a topic</Dialog.Title><Dialog.Description className="mt-1 text-sm text-muted">Search titles, summaries, or organ systems. Results are sorted A-Z and paginated.</Dialog.Description></div><Dialog.Close aria-label="Close topic picker" className="inline-flex size-11 items-center justify-center rounded-xl border border-border"><X aria-hidden className="size-4" /></Dialog.Close></div>
          <form className="mt-5 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); load(1); }}><label className="sr-only" htmlFor={`${name}-topic-search`}>Search topics</label><input className={fieldClass} id={`${name}-topic-search`} onChange={(event) => setSearch(event.target.value)} placeholder="Topic or organ system" type="search" value={search} /><Button disabled={pending} type="submit"><Search aria-hidden className="size-4" />Search</Button></form>
          {error ? <p className="mt-4 rounded-xl bg-destructive-soft p-3 text-sm font-semibold text-destructive" role="alert">{error}</p> : null}
          {pending ? <p className="mt-6 text-sm text-muted" role="status">Loading topics...</p> : result.items.length ? <div className="mt-5 grid gap-3">{result.items.map((topic) => <article className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between" key={topic.id}><div className="min-w-0"><p className="font-bold text-foreground">{topic.title}</p><p className="mt-1 text-sm text-muted">{topic.organSystemName}</p></div><Button aria-label={`Select ${topic.title}`} onClick={() => choose(topic)} size="sm" type="button" variant={topic.id === selectedId ? "default" : "outline"}>{topic.id === selectedId ? "Selected" : "Select"}</Button></article>)}</div> : <p className="mt-6 rounded-xl bg-subtle p-5 text-center text-sm text-muted">No current topics match this search.</p>}
          {result.pagination.totalPages > 1 ? <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5"><span className="text-sm text-muted">Page {result.pagination.page} of {result.pagination.totalPages} <span className="hidden sm:inline">({result.pagination.total} topics)</span></span><div className="flex gap-2"><Button disabled={pending || result.pagination.page <= 1} onClick={() => load(result.pagination.page - 1)} size="sm" type="button" variant="outline"><ChevronLeft aria-hidden className="size-4" />Previous</Button><Button disabled={pending || result.pagination.page >= result.pagination.totalPages} onClick={() => load(result.pagination.page + 1)} size="sm" type="button" variant="outline">Next<ChevronRight aria-hidden className="size-4" /></Button></div></div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </div>;
}
