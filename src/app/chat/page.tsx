import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createWorkspace } from "@/app/actions/workspace-actions";
import { SiteHeader } from "@/components/site-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { WorkspaceGrid, type WorkspaceCardData } from "@/components/workspace/workspace-grid";

export default async function ChatPage() {
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

  const workspaceCards: WorkspaceCardData[] = workspaces.map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    documentsCount: workspace._count.documents,
    questionPairs: Math.floor(workspace._count.chatMessages / 2),
  }));

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader variant="app" />
      <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-8 sm:px-6 sm:pt-12">
        <div className="reveal border-b border-line pb-8">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-indigo">
            Grounded assistant
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-[-.03em] text-ink sm:text-5xl">
            Chat
          </h1>
          <p className="mt-3 max-w-lg text-ink-muted">
            Choose a workspace to ask questions about its documents, or create a new
            workspace to get started.
          </p>
        </div>

        <form
          action={createWorkspace}
          className="reveal mt-8 flex w-full max-w-xl flex-col gap-2 sm:flex-row"
          style={{ animationDelay: "80ms" }}
        >
          <input
            name="name"
            placeholder="Name a new workspace"
            aria-label="New workspace name"
            className="min-w-0 flex-1 rounded-xl border border-line bg-paper-raised px-3.5 py-3 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-highlight focus:ring-4 focus:ring-highlight/10"
            required
          />
          <SubmitButton
            pendingChildren="Creating…"
            className="h-12 shrink-0 rounded-xl bg-gradient-to-r from-[#4c43ce] to-[#35d7ff] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(53,215,255,.18)] transition-all hover:-translate-y-0.5 hover:brightness-110"
          >
            Create <span aria-hidden="true">+</span>
          </SubmitButton>
        </form>

        <section className="reveal mt-10" style={{ animationDelay: "140ms" }}>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-indigo">
                Your workspaces
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">Select a workspace</h2>
            </div>
            <span className="text-xs text-ink-muted">{workspaceCards.length} available</span>
          </div>

          <WorkspaceGrid initialWorkspaces={workspaceCards} />
        </section>
      </main>
    </div>
  );
}