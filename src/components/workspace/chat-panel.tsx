"use client";

import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DocumentUpload } from "@/components/workspace/document-upload";
import { Spinner } from "@/components/ui/spinner";
import { parseJsonResponse } from "@/lib/fetch-json";
import type { ChatSource, DocumentSummary } from "@/components/workspace/types";

type ChatMessage =
  | { id?: string; role: "user"; content: string; createdAt?: string }
  | { id?: string; role: "assistant"; content: string; sources: ChatSource[]; createdAt?: string }
  | { id?: string; role: "error"; content: string };

type ChatPanelProps = {
  workspaceId: string;
  hasReadyDocuments: boolean;
  documents: DocumentSummary[];
  onDocumentAdded: (document: DocumentSummary) => void;
  onDocumentRemoved: (documentId: string) => void;
};

function renderAnswer(content: string) {
  const parts = content.split(/(\[\d+\])/g);
  return parts.map((part, index) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (!match) return <span key={index}>{part}</span>;
    return (
      <sup
        key={index}
        className="mx-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-highlight text-[10px] font-bold text-ink"
      >
        {match[1]}
      </sup>
    );
  });
}

export function ChatPanel({
  workspaceId,
  hasReadyDocuments,
  documents,
  onDocumentAdded,
  onDocumentRemoved,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void fetch(`/api/workspaces/${workspaceId}/chat`)
      .then((response) =>
        parseJsonResponse<{
          messages: Array<{ id: string; role: string; content: string; sources?: ChatSource[]; createdAt: string }>;
        }>(response)
      )
      .then((payload) => {
        if (cancelled) return;
        const historyMessages: ChatMessage[] = payload.messages.flatMap((message): ChatMessage[] => {
          if (message.role === "user") return [{ ...message, role: "user" as const }];
          if (message.role === "assistant") {
            return [{ ...message, role: "assistant" as const, sources: message.sources ?? [] }];
          }
          return [];
        });
        setMessages(historyMessages);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setHistoryLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;

    setMessages((current) => [...current, { role: "user", content: trimmed }]);
    setQuestion("");
    setIsLoading(true);

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const payload = await parseJsonResponse<{ answer: string; sources?: ChatSource[] }>(response);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: payload.answer, sources: payload.sources ?? [] },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { role: "error", content: error instanceof Error ? error.message : "Failed to get an answer" },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <div className="flex h-[clamp(28rem,calc(100svh-8rem),40rem)] min-h-0 min-w-0 flex-col overflow-hidden rounded-[1.25rem] bg-transparent p-2.5 text-white shadow-[0_12px_30px_rgba(19,44,58,.15)] sm:h-[clamp(30rem,calc(100svh-9rem),44rem)] sm:p-4">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 sm:space-y-4">
        {historyLoaded && messages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[.04] px-4 py-8 text-center">
            <p className="text-2xl text-highlight" aria-hidden="true">
              ⌁
            </p>
            <p className="mt-3 text-sm leading-6 text-white/65">
              {hasReadyDocuments
                ? "Ask a question about your documents to get started."
                : "Attach a document below, then ask a question about it."}
            </p>
          </div>
        ) : null}

        {!historyLoaded ? (
          <div className="flex items-center gap-2 px-1 text-xs text-white/45">
            <Spinner className="h-3.5 w-3.5" />
            Loading conversation…
          </div>
        ) : null}

        {messages.map((message, index) => {
          if (message.role === "user") {
            return (
              <div
                key={message.id ?? `user-${index}`}
                className="ml-auto max-w-[92%] rounded-2xl rounded-br-md bg-[#304a8a] px-4 py-3 text-sm font-medium leading-6 text-[#eaf5ff] shadow-[0_8px_20px_rgba(53,215,255,.12)] sm:max-w-[85%]"
              >
                {message.content}
              </div>
            );
          }

          if (message.role === "error") {
            return (
              <div
                key={`error-${index}`}
                role="alert"
                className="rounded-2xl border border-signal/30 bg-signal/15 px-4 py-3 text-sm text-[#ffd8cc]"
              >
                {message.content}
              </div>
            );
          }

          return (
            <div key={message.id ?? `assistant-${index}`} className="max-w-[98%] space-y-3 sm:max-w-[95%]">
              <p className="rounded-2xl rounded-bl-md bg-white/[.09] px-4 py-3 text-sm leading-6 text-white/90 sm:text-[15px] sm:leading-7">
                {renderAnswer(message.content)}
              </p>
              {message.sources.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {message.sources.map((source) => (
                    <div
                      key={source.chunkId}
                      className="rounded-xl border border-white/10 bg-white/[.05] px-3 py-2.5 text-xs text-white/55"
                    >
                      <p className="font-semibold text-highlight">
                        [{source.index}] {source.documentName}
                      </p>
                      <p className="mt-1.5 line-clamp-3 leading-5">{source.content}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}

        {isLoading ? (
          <div className="flex max-w-[85%] items-center gap-2 rounded-2xl bg-white/[.09] px-4 py-3 text-sm text-white/60">
            <Spinner className="h-3.5 w-3.5" />
            Thinking…
          </div>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="mt-2 shrink-0 rounded-2xl border border-white/10 bg-white/[.06] p-2 sm:mt-3">
        <DocumentUpload
          workspaceId={workspaceId}
          documents={documents}
          onDocumentAdded={onDocumentAdded}
          onDocumentRemoved={onDocumentRemoved}
          compact
        />
        <div className="mt-2 flex gap-2 border-t border-white/10 pt-2">
          <Textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasReadyDocuments ? "Ask a question…" : "Attach a document first"}
            disabled={!hasReadyDocuments || isLoading}
            rows={2}
            className="min-w-0 resize-none border-0 bg-transparent text-white shadow-none placeholder:text-white/35 focus:ring-0"
          />
          <Button
            type="submit"
            disabled={!hasReadyDocuments || isLoading || !question.trim()}
            aria-busy={isLoading}
            className="inline-flex shrink-0 items-center gap-1.5 self-end bg-highlight px-3 text-ink shadow-none hover:bg-white sm:px-4"
          >
            {isLoading ? (
              <>
                <Spinner className="h-3.5 w-3.5" />
                Asking…
              </>
            ) : (
              <>
                Ask <span aria-hidden="true">↗</span>
              </>
            )}
          </Button>
        </div>
      </form>

      <p className="mt-1 shrink-0 px-1 text-[9px] uppercase tracking-[.1em] text-white/35 sm:mt-2 sm:text-[10px] sm:tracking-[.12em]">
        Enter to send · Shift + Enter for a new line
      </p>
    </div>
  );
}