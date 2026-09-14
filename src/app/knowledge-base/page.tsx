import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";

export default async function KnowledgeBasePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaces = await prisma.workspace.findMany({
    where: { members: { some: { userId: user.id } } },
    include: { _count: { select: { documents: true, members: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const totalDocuments = workspaces.reduce((sum, workspace) => sum + workspace._count.documents, 0);

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader variant="app" />
      <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pb-20 sm:pt-10 lg:px-8">
        <div className="border-b border-line pb-8">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-indigo">
            Your intelligence layer
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Knowledge Base
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
            See how your knowledge is organized, where it lives, and which workspace is
            ready for your next question.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-indigo/35 bg-gradient-to-br from-[#182b73] to-[#101a42] p-5">
            <p className="text-xs uppercase tracking-[.16em] text-[#a99bff]">Active workspaces</p>
            <p className="mt-3 text-4xl font-bold text-white">{workspaces.length}</p>
            <p className="mt-2 text-xs text-ink-muted">Private spaces for focused work</p>
          </div>
          <div className="dark-panel rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[.16em] text-ink-muted">Indexed documents</p>
            <p className="mt-3 text-4xl font-bold text-[#55cfff]">{totalDocuments}</p>
            <p className="mt-2 text-xs text-ink-muted">Sources available to your AI</p>
          </div>
          <div className="dark-panel rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[.16em] text-ink-muted">Retrieval status</p>
            <p className="mt-3 text-2xl font-bold text-emerald-300">● Ready</p>
            <p className="mt-2 text-xs text-ink-muted">Your knowledge layer is online</p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-semibold text-white">Workspace knowledge</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Open a workspace to view its conversation history.
            </p>
          </div>
          <Link href="/workspaces" className="text-sm font-semibold text-indigo hover:text-highlight">
            Manage workspaces →
          </Link>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {workspaces.length === 0 ? (
            <div className="dark-panel rounded-2xl p-6 text-center text-sm text-ink-muted sm:p-8 md:col-span-2">
              Create your first workspace to start building a knowledge base.
            </div>
          ) : (
            workspaces.map((workspace, index) => (
              <Link
                key={workspace.id}
                href={`/search?workspaceId=${workspace.id}`}
                className="dark-panel group rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-indigo"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.16em] text-indigo">
                      Base {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-3 text-xl font-semibold text-white">{workspace.name}</h3>
                  </div>
                  <span className="rounded-full bg-indigo/15 px-3 py-1 text-xs text-[#b49dff]">
                    {workspace.type.toLowerCase()}
                  </span>
                </div>
                <div className="mt-7 flex flex-wrap gap-x-8 gap-y-2 text-xs text-ink-muted">
                  <span>
                    <b className="text-white">{workspace._count.documents}</b> documents
                  </span>
                  <span>
                    <b className="text-white">{workspace._count.members}</b> members
                  </span>
                  <span className="ml-auto font-semibold text-indigo group-hover:text-highlight">
                    View history →
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}