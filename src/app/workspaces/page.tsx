import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";

export default async function WorkspacesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaces = await prisma.workspace.findMany({
    where: { members: { some: { userId: user.id } } },
    include: { _count: { select: { documents: true, chatMessages: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const totalDocuments = workspaces.reduce((sum, workspace) => sum + workspace._count.documents, 0);
  const totalQuestions = workspaces.reduce(
    (sum, workspace) => sum + Math.floor(workspace._count.chatMessages / 2),
    0
  );
  const maxDocuments = Math.max(1, ...workspaces.map((workspace) => workspace._count.documents));

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader variant="app" />
      <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-8 sm:px-6 sm:pt-12">
        <div className="reveal border-b border-line pb-8">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-indigo">
            Your knowledge layer
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-[-.03em] text-ink sm:text-5xl">
            Dashboard
          </h1>
          <p className="mt-3 max-w-md text-ink-muted">
            See your knowledge activity at a glance, then open a workspace to continue.
          </p>
        </div>

        <section className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="dark-panel rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[.16em] text-ink-muted">Workspaces</p>
            <p className="mt-2 text-3xl font-bold text-white">{workspaces.length}</p>
            <p className="mt-1 text-xs text-ink-muted">Private spaces for your work</p>
          </div>
          <div className="dark-panel rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[.16em] text-ink-muted">Documents indexed</p>
            <p className="mt-2 text-3xl font-bold text-[#55cfff]">{totalDocuments}</p>
            <p className="mt-1 text-xs text-ink-muted">Sources ready for grounded answers</p>
          </div>
          <div className="dark-panel rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[.16em] text-ink-muted">Questions asked</p>
            <p className="mt-2 text-3xl font-bold text-[#a486ff]">{totalQuestions}</p>
            <p className="mt-1 text-xs text-ink-muted">Conversation turns across workspaces</p>
          </div>
        </section>

        <section className="dark-panel mt-5 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-indigo">
                Knowledge activity
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">Documents by workspace</h2>
            </div>
            <Link href="/documents" className="text-sm font-semibold text-indigo hover:text-highlight">
              View all documents →
            </Link>
          </div>

          {workspaces.length === 0 ? (
            <p className="mt-6 text-sm text-ink-muted">
              Open Chat to create a workspace and upload a document to start seeing activity
              here.
            </p>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {workspaces.map((workspace) => (
                <div key={workspace.id} className="min-w-0">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate text-ink-muted">{workspace.name}</span>
                    <span className="font-semibold text-white">{workspace._count.documents}</span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/[.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo to-highlight"
                      style={{
                        width: `${Math.max(8, (workspace._count.documents / maxDocuments) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-ink-muted">
                    {Math.floor(workspace._count.chatMessages / 2)} question pairs
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}