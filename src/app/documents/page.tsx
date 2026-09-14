import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { DocumentsExplorer, type DocumentRow } from "@/components/documents/documents-explorer";

export default async function DocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const documents = await prisma.document.findMany({
    where: { workspace: { members: { some: { userId: user.id } } } },
    include: { workspace: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const indexed = documents.filter((document) => document.status === "COMPLETED").length;

  const rows: DocumentRow[] = documents.map((document) => ({
    id: document.id,
    name: document.name,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    status: document.status,
    createdAt: document.createdAt.toISOString(),
    workspaceId: document.workspace.id,
    workspaceName: document.workspace.name,
  }));

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader variant="app" />
      <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pb-20 sm:pt-10 lg:px-8">
        <div className="border-b border-line pb-7">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-indigo">
            Knowledge library
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Documents
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-ink-muted">
            One place to see every source powering your workspaces and grounded answers.
          </p>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <div className="dark-panel rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[.16em] text-ink-muted">Total sources</p>
            <p className="mt-2 text-3xl font-bold text-white">{documents.length}</p>
          </div>
          <div className="dark-panel rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[.16em] text-ink-muted">Indexed and ready</p>
            <p className="mt-2 text-3xl font-bold text-[#55cfff]">{indexed}</p>
          </div>
          <div className="dark-panel rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[.16em] text-ink-muted">Workspaces covered</p>
            <p className="mt-2 text-3xl font-bold text-[#a486ff]">
              {new Set(documents.map((document) => document.workspaceId)).size}
            </p>
          </div>
        </div>

        <DocumentsExplorer documents={rows} />
      </main>
    </div>
  );
}