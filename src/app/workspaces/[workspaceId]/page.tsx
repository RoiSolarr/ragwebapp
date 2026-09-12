import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { WorkspaceConsole } from "@/components/workspace/workspace-console";
import type { DocumentSummary } from "@/components/workspace/types";

type WorkspacePageProps = { params: Promise<{ workspaceId: string }> };

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const workspace = await prisma.workspace.findFirst({ where: { id: workspaceId, members: { some: { userId: user.id } } }, include: { documents: { orderBy: { createdAt: "desc" }, select: { id: true, name: true, mimeType: true, sizeBytes: true, status: true, error: true, createdAt: true } } } });
  if (!workspace) notFound();
  const documents: DocumentSummary[] = workspace.documents.map((document: Omit<DocumentSummary, "createdAt"> & { createdAt: Date }) => ({ ...document, createdAt: document.createdAt.toISOString() }));
  return <div className="min-h-screen bg-paper"><SiteHeader variant="app" /><main className="mx-auto w-full max-w-6xl px-4 pb-4 pt-2 sm:px-6 sm:pb-6 sm:pt-3 lg:px-8"><div className="reveal mt-0.5 flex min-w-0 flex-col justify-between gap-2 border-b border-line pb-3 sm:mt-1 sm:flex-row sm:items-center sm:pb-4"><div className="min-w-0"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-indigo sm:text-xs"><span className="h-1.5 w-1.5 rounded-full bg-highlight" /> Active workspace</p><h1 className="mt-0.5 truncate font-serif text-xl font-semibold tracking-[-.03em] text-ink sm:text-3xl">{workspace.name}</h1><p className="mt-1 text-[11px] text-ink-muted sm:text-xs">{workspace.type.toLowerCase()} workspace · documents and grounded answers</p></div><div className="w-fit rounded-lg border border-line bg-paper-raised px-2.5 py-1.5 text-left sm:ml-auto sm:text-right"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-ink-muted">Workspace mode</p><p className="mt-0.5 text-xs font-semibold text-indigo sm:text-sm">Private retrieval</p></div></div><div className="reveal mt-2 sm:mt-3" style={{ animationDelay: "100ms" }}><WorkspaceConsole workspaceId={workspace.id} initialDocuments={documents} /></div></main></div>;
}
