"use client";

import { useMemo, useState } from "react";
import { ChatPanel } from "@/components/workspace/chat-panel";
import type { DocumentSummary } from "@/components/workspace/types";

type WorkspaceConsoleProps = { workspaceId: string; initialDocuments: DocumentSummary[] };

export function WorkspaceConsole({ workspaceId, initialDocuments }: WorkspaceConsoleProps) {
  const [documents, setDocuments] = useState<DocumentSummary[]>(initialDocuments);

  const hasReadyDocuments = useMemo(
    () => documents.some((document) => document.status === "COMPLETED"),
    [documents]
  );

  function handleDocumentAdded(document: DocumentSummary) {
    setDocuments((current) => [document, ...current]);
  }

  function handleDocumentRemoved(documentId: string) {
    setDocuments((current) => current.filter((document) => document.id !== documentId));
  }

  return (
    <div className="dark-panel min-w-0 overflow-hidden rounded-[1.5rem] p-3 shadow-[0_12px_30px_rgba(19,44,58,.12)] sm:p-5">
      <ChatPanel
        workspaceId={workspaceId}
        hasReadyDocuments={hasReadyDocuments}
        documents={documents}
        onDocumentAdded={handleDocumentAdded}
        onDocumentRemoved={handleDocumentRemoved}
      />
    </div>
  );
}