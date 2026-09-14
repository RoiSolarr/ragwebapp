"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type DocumentRow = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  createdAt: string;
  workspaceId: string;
  workspaceName: string;
};

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileKind(mime: string) {
  if (mime.includes("pdf")) return "PDF";
  if (mime.includes("markdown")) return "MD";
  return "TXT";
}

export function DocumentsExplorer({ documents }: { documents: DocumentRow[] }) {
  const [query, setQuery] = useState("");

  // Filtering the already-fetched list in memory means results update on
  // every keystroke with no network round trip and no need to press
  // Search first.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter(
      (document) =>
        document.name.toLowerCase().includes(q) || document.workspaceName.toLowerCase().includes(q)
    );
  }, [documents, query]);

  return (
    <>
      <div className="mt-8 max-w-xl">
        <div className="relative">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-12 w-full rounded-xl border border-line bg-paper-raised px-4 pr-10 text-sm outline-none focus:border-indigo"
            placeholder="Search by document or workspace name…"
            aria-label="Search documents"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-muted transition hover:text-white"
            >
              <span aria-hidden="true">✕</span>
            </button>
          ) : null}
        </div>
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-line bg-paper-raised">
        <div className="hidden grid-cols-[minmax(0,1.4fr)_1fr_110px_130px] gap-4 border-b border-line bg-[#0f2349] px-5 py-3 text-[10px] font-bold uppercase tracking-[.16em] text-ink-muted sm:grid">
          <span>Name</span>
          <span>Workspace</span>
          <span>Status</span>
          <span>Size</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-ink-muted sm:p-10">
            {query
              ? "No documents or workspaces match your search."
              : "No documents yet. Open a workspace to upload your first source."}
          </div>
        ) : (
          filtered.map((document) => (
            <div
              key={document.id}
              className="grid gap-3 border-b border-line px-4 py-4 last:border-0 sm:grid-cols-[minmax(0,1.4fr)_1fr_110px_130px] sm:items-center sm:gap-4 sm:px-5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo/20 text-[10px] font-bold text-[#b49dff]">
                  {fileKind(document.mimeType)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{document.name}</p>
                  <Link
                    className="text-xs text-ink-muted hover:text-highlight"
                    href={`/workspaces/${document.workspaceId}`}
                  >
                    {document.workspaceName}
                  </Link>
                </div>
              </div>
              <p className="text-xs text-ink-muted sm:block">{document.workspaceName}</p>
              <span className="w-fit rounded-full border border-indigo/30 bg-indigo/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[.08em] text-[#b49dff]">
                {document.status.toLowerCase()}
              </span>
              <p className="text-xs text-ink-muted">{formatSize(document.sizeBytes)}</p>
            </div>
          ))
        )}
      </section>
    </>
  );
}