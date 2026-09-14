"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { parseJsonResponse } from "@/lib/fetch-json";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export type WorkspaceCardData = {
  id: string;
  name: string;
  documentsCount: number;
  questionPairs: number;
};

type WorkspaceGridProps = { initialWorkspaces: WorkspaceCardData[] };

type PendingDelete = { kind: "single"; id: string; name: string } | { kind: "bulk"; ids: string[] };

export function WorkspaceGrid({ initialWorkspaces }: WorkspaceGridProps) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState(initialWorkspaces);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allSelected = workspaces.length > 0 && selectedIds.size === workspaces.length;

  function toggleSelect(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((current) =>
      current.size === workspaces.length ? new Set() : new Set(workspaces.map((workspace) => workspace.id))
    );
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  // Uses allSettled (not all) so that if some workspaces fail to delete
  // (e.g. the caller isn't the OWNER of one of several selected ones), the
  // ones that did succeed still disappear from the UI instead of the whole
  // batch silently rolling back to "nothing changed".
  async function deleteWorkspaceIds(ids: string[]) {
    setIsDeleting(true);
    setError(null);

    const results = await Promise.allSettled(
      ids.map(async (id) => {
        const response = await fetch(`/api/workspaces/${id}`, { method: "DELETE" });
        await parseJsonResponse<{ success: boolean }>(response);
        return id;
      })
    );

    const succeededIds = results
      .filter((result): result is PromiseFulfilledResult<string> => result.status === "fulfilled")
      .map((result) => result.value);
    const failedCount = results.length - succeededIds.length;

    if (succeededIds.length > 0) {
      setWorkspaces((current) => current.filter((workspace) => !succeededIds.includes(workspace.id)));
      setSelectedIds((current) => {
        const next = new Set(current);
        succeededIds.forEach((id) => next.delete(id));
        return next;
      });
    }

    if (failedCount > 0) {
      const firstFailure = results.find(
        (result): result is PromiseRejectedResult => result.status === "rejected"
      );
      const message = firstFailure?.reason instanceof Error ? firstFailure.reason.message : "Failed to delete workspace";
      setError(ids.length === 1 ? message : `${message} (${failedCount} of ${ids.length} failed)`);
    }

    if (succeededIds.length > 0) {
      router.refresh();
    }

    setIsDeleting(false);
    setPendingDelete(null);
  }

  const dialogCopy = useMemo(() => {
    if (!pendingDelete) return null;
    if (pendingDelete.kind === "single") {
      return {
        title: `Delete "${pendingDelete.name}"?`,
        description:
          "This permanently removes the workspace along with every document and conversation inside it. This can't be undone.",
      };
    }
    return {
      title: `Delete ${pendingDelete.ids.length} workspaces?`,
      description:
        "This permanently removes the selected workspaces along with every document and conversation inside each of them. This can't be undone.",
    };
  }, [pendingDelete]);

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {selectMode ? (
          <>
            <label className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-line accent-indigo"
              />
              Select all
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  selectedIds.size > 0 && setPendingDelete({ kind: "bulk", ids: Array.from(selectedIds) })
                }
                disabled={selectedIds.size === 0}
                className="rounded-lg border border-signal/40 px-3 py-1.5 text-xs font-semibold text-signal transition hover:bg-signal/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Delete selected ({selectedIds.size})
              </button>
              <button
                type="button"
                onClick={exitSelectMode}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:text-white"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setSelectMode(true)}
            className="ml-auto rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:border-indigo hover:text-indigo"
          >
            Select workspaces
          </button>
        )}
      </div>

      {error ? (
        <p role="alert" className="mt-3 rounded-xl border border-signal/25 bg-signal/10 px-3 py-2 text-sm text-signal">
          {error}
        </p>
      ) : null}

      {workspaces.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-indigo/30 bg-paper-raised p-8 text-center">
          <p className="text-sm text-ink-muted">
            Create a workspace above to open your first grounded chat.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace, index) => (
            <div
              key={workspace.id}
              className="group relative rounded-[1.25rem] border border-line bg-paper-raised p-6 shadow-[0_4px_14px_rgba(19,44,58,.05)] transition-all hover:-translate-y-1 hover:border-highlight/50 hover:shadow-[0_16px_30px_rgba(53,215,255,.12)]"
            >
              <div className="flex items-center justify-between gap-3">
                {selectMode ? (
                  <label className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-indigo">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(workspace.id)}
                      onChange={() => toggleSelect(workspace.id)}
                      className="h-4 w-4 shrink-0 rounded border-line accent-indigo"
                    />
                    Workspace {String(index + 1).padStart(2, "0")}
                  </label>
                ) : (
                  <p className="text-xs font-bold uppercase tracking-[.16em] text-indigo">
                    Workspace {String(index + 1).padStart(2, "0")}
                  </p>
                )}
                <div className="flex shrink-0 items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-highlight" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={() => setPendingDelete({ kind: "single", id: workspace.id, name: workspace.name })}
                    aria-label={`Delete ${workspace.name}`}
                    className="grid h-6 w-6 place-items-center rounded-md text-ink-muted transition hover:bg-signal/10 hover:text-signal"
                  >
                    <span aria-hidden="true">✕</span>
                  </button>
                </div>
              </div>

              <Link href={`/workspaces/${workspace.id}`} className="mt-8 block">
                <h3 className="truncate font-serif text-xl font-semibold text-ink">{workspace.name}</h3>
                <p className="mt-2 text-sm text-ink-muted">
                  {workspace.documentsCount} documents · {workspace.questionPairs} question pairs
                </p>
                <span className="mt-8 inline-flex text-xs font-bold uppercase tracking-[.14em] text-ink-muted transition-colors group-hover:text-indigo">
                  Open chat{" "}
                  <span className="ml-2 transition-transform group-hover:translate-x-1" aria-hidden="true">
                    →
                  </span>
                </span>
              </Link>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={dialogCopy?.title ?? ""}
        description={dialogCopy?.description ?? ""}
        confirmLabel="Delete"
        isConfirming={isDeleting}
        onCancel={() => {
          if (!isDeleting) setPendingDelete(null);
        }}
        onConfirm={() => {
          if (!pendingDelete) return;
          const ids = pendingDelete.kind === "single" ? [pendingDelete.id] : pendingDelete.ids;
          void deleteWorkspaceIds(ids);
        }}
      />
    </>
  );
}