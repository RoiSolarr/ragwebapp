"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { parseJsonResponse } from "@/lib/fetch-json";
import { Spinner } from "@/components/ui/spinner";
import type { DocumentSummary } from "@/components/workspace/types";

type DocumentUploadProps = {
  workspaceId: string;
  documents: DocumentSummary[];
  onDocumentAdded: (document: DocumentSummary) => void;
  onDocumentRemoved: (documentId: string) => void;
  compact?: boolean;
};

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
};
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  const date = new Date(iso);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;
}

const STATUS_LABEL: Record<DocumentSummary["status"], string> = {
  PENDING: "Pending",
  PROCESSING: "Processing…",
  COMPLETED: "Ready",
  FAILED: "Failed",
};

const STATUS_CLASS_LIGHT: Record<DocumentSummary["status"], string> = {
  PENDING: "border-line bg-paper text-ink-muted",
  PROCESSING: "border-indigo/20 bg-indigo/10 text-indigo",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  FAILED: "border-signal/25 bg-signal/10 text-signal",
};

const STATUS_CLASS_DARK: Record<DocumentSummary["status"], string> = {
  PENDING: "border-white/15 bg-white/[.04] text-white/60",
  PROCESSING: "border-highlight/25 bg-highlight/10 text-highlight",
  COMPLETED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  FAILED: "border-signal/30 bg-signal/15 text-signal",
};

/**
 * Renders the upload dropzone plus (when expanded, or always in the
 * non-compact layout) the full per-document list: status, size, date,
 * and a delete button. `compact` controls the visual theme only —
 * dark/glass to sit inside the chat panel, or light/paper to stand on
 * its own — the manage list and delete feature work the same either way.
 */
export function DocumentUpload({
  workspaceId,
  documents,
  onDocumentAdded,
  onDocumentRemoved,
  compact = false,
}: DocumentUploadProps) {
  const [uploadingNames, setUploadingNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!compact);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null);
      setUploadingNames((names) => [...names, file.name]);
      try {
        const formData = new FormData();
        formData.append("workspaceId", workspaceId);
        formData.append("file", file);
        const response = await fetch("/api/documents/upload", { method: "POST", body: formData });
        const payload = await parseJsonResponse<{ document: DocumentSummary }>(response);
        onDocumentAdded(payload.document);
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Failed to upload document");
      } finally {
        setUploadingNames((names) => names.filter((name) => name !== file.name));
      }
    },
    [workspaceId, onDocumentAdded]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: unknown[]) => {
      if (fileRejections.length > 0) {
        setError("Only PDF, Markdown, and plain text files up to 10MB are supported.");
      }
      acceptedFiles.forEach((file) => void uploadFile(file));
    },
    [uploadFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE_BYTES,
    multiple: true,
  });

  // Disabling the button for the duration of the request (via
  // `deletingIds`) is what stops a slow delete from being triggered
  // twice by an extra click — the loading-animation requirement this
  // component needed most, since it previously had no delete action at
  // all to guard.
  async function deleteDocument(document: DocumentSummary) {
    if (deletingIds.includes(document.id)) return;
    const confirmed = window.confirm(`Remove "${document.name}" from this workspace? This can't be undone.`);
    if (!confirmed) return;

    setError(null);
    setDeletingIds((ids) => [...ids, document.id]);
    try {
      const response = await fetch(`/api/documents/${document.id}`, { method: "DELETE" });
      await parseJsonResponse<{ success: boolean }>(response);
      onDocumentRemoved(document.id);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to remove document");
    } finally {
      setDeletingIds((ids) => ids.filter((id) => id !== document.id));
    }
  }

  const statusClass = compact ? STATUS_CLASS_DARK : STATUS_CLASS_LIGHT;

  const manageList = (
    <ul className={cn("space-y-2", compact ? "mt-2" : "mt-5")}>
      {uploadingNames.map((name) => (
        <li
          key={`uploading-${name}`}
          className={cn(
            "flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-sm",
            compact ? "border-highlight/20 bg-highlight/[.06] text-white" : "border-indigo/20 bg-indigo/[.04]"
          )}
        >
          <span className={cn("truncate font-medium", compact ? "text-white" : "text-ink")}>{name}</span>
          <span
            className={cn(
              "flex shrink-0 items-center gap-1.5 text-xs font-semibold",
              compact ? "text-highlight" : "text-indigo"
            )}
          >
            <Spinner className="h-3 w-3" />
            Uploading…
          </span>
        </li>
      ))}

      {documents.length === 0 && uploadingNames.length === 0 ? (
        <li
          className={cn(
            "rounded-xl border border-dashed px-3.5 py-5 text-center text-sm",
            compact ? "border-white/15 text-white/50" : "border-line text-ink-muted"
          )}
        >
          Your source library is empty.
        </li>
      ) : null}

      {documents.map((document) => {
        const isDeleting = deletingIds.includes(document.id);
        return (
          <li
            key={document.id}
            className={cn(
              "rounded-xl border px-3.5 py-3",
              compact ? "border-white/10 bg-white/[.04]" : "border-line bg-paper"
            )}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold shadow-sm",
                    compact ? "bg-white/[.08] text-highlight" : "bg-paper-raised text-indigo"
                  )}
                  aria-hidden="true"
                >
                  DOC
                </span>
                <div className="min-w-0">
                  <p className={cn("truncate text-sm font-semibold", compact ? "text-white" : "text-ink")}>
                    {document.name}
                  </p>
                  <div
                    className={cn(
                      "mt-1 flex items-center gap-2 text-xs",
                      compact ? "text-white/50" : "text-ink-muted"
                    )}
                  >
                    <span>{formatFileSize(document.sizeBytes)}</span>
                    <span aria-hidden>·</span>
                    <span>{formatDate(document.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                <span
                  className={cn(
                    "rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[.08em]",
                    statusClass[document.status]
                  )}
                >
                  {STATUS_LABEL[document.status]}
                </span>
                <button
                  type="button"
                  onClick={() => void deleteDocument(document)}
                  disabled={isDeleting}
                  aria-busy={isDeleting}
                  aria-label={`Remove ${document.name}`}
                  className={cn(
                    "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs transition disabled:cursor-not-allowed disabled:opacity-60",
                    compact
                      ? "border-white/15 text-white/60 hover:border-signal/50 hover:text-signal"
                      : "border-line text-ink-muted hover:border-signal/50 hover:text-signal"
                  )}
                >
                  {isDeleting ? <Spinner className="h-3.5 w-3.5" /> : <span aria-hidden="true">✕</span>}
                </button>
              </div>
            </div>

            {document.status === "FAILED" && document.error ? (
              <p
                className={cn(
                  "mt-2 rounded-lg px-2.5 py-2 text-xs",
                  compact ? "bg-signal/10 text-signal" : "bg-signal/10 text-signal"
                )}
              >
                {document.error}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );

  if (compact) {
    return (
      <div className="min-w-0">
        <div
          {...getRootProps()}
          className={cn(
            "flex min-w-0 cursor-pointer items-center gap-2 rounded-xl border border-dashed px-3 py-2 transition",
            isDragActive
              ? "border-highlight bg-highlight/10"
              : "border-white/15 bg-white/[.04] hover:border-highlight/50 hover:bg-white/[.07]"
          )}
        >
          <input {...getInputProps()} />
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-highlight text-sm font-bold text-ink"
            aria-hidden="true"
          >
            ↑
          </span>
          <span className="min-w-0 truncate text-xs font-semibold text-white">
            {isDragActive ? "Drop files here" : "Attach PDF, Markdown, or TXT"}
          </span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setExpanded((value) => !value);
            }}
            className="ml-auto flex shrink-0 items-center gap-1 text-[10px] text-white hover:text-highlight"
          >
            {documents.length} ready
            <span aria-hidden="true">{expanded ? "▴" : "▾"}</span>
          </button>
        </div>

        {uploadingNames.length > 0 ? (
          <p className="mt-1 flex items-center gap-1.5 text-[10px] text-highlight">
            <Spinner className="h-2.5 w-2.5" />
            Uploading {uploadingNames.join(", ")}…
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="mt-1 text-[10px] text-signal">
            {error}
          </p>
        ) : null}

        {expanded ? manageList : null}
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-[1.25rem] border border-line bg-paper-raised p-4 shadow-[0_4px_14px_rgba(19,44,58,.05)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-indigo">01 / source library</p>
          <h2 className="mt-2 text-xl font-semibold text-ink sm:text-2xl">Documents</h2>
          <p className="mt-1 text-sm text-ink-muted">Add the material your answers should be grounded in.</p>
        </div>
        <span className="shrink-0 rounded-full bg-mint px-2.5 py-1 text-xs font-bold text-indigo">
          {documents.length} indexed
        </span>
      </div>

      <div
        {...getRootProps()}
        className={cn(
          "mt-6 cursor-pointer rounded-2xl border border-dashed px-4 py-8 text-center transition-all duration-200",
          isDragActive ? "border-indigo bg-indigo/10" : "border-line bg-paper hover:border-indigo/50 hover:bg-indigo/[.03]"
        )}
      >
        <input {...getInputProps()} />
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-ink text-xl text-highlight" aria-hidden="true">
          ↑
        </div>
        <p className="mt-3 text-sm font-semibold text-ink">
          {isDragActive ? "Drop to upload" : "Drag files here, or click to browse"}
        </p>
        <p className="mt-1 text-xs text-ink-muted">PDF, Markdown, or plain text · up to 10MB</p>
      </div>

      {error ? (
        <p role="alert" className="mt-3 rounded-xl border border-signal/25 bg-signal/10 px-3 py-2 text-sm text-signal">
          {error}
        </p>
      ) : null}

      {manageList}
    </div>
  );
}