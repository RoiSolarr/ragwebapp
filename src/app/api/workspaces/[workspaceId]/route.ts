import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceMembership } from "@/lib/workspace-access";

export const runtime = "nodejs";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await getWorkspaceMembership(workspaceId, user.id);
  if (!membership) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  if (membership.role !== "OWNER") {
    return NextResponse.json(
      { error: "Only the workspace owner can delete this workspace." },
      { status: 403 }
    );
  }

  // Workspace's child relations (members, documents, document chunks, chat
  // messages) all cascade on delete at the schema level, so removing the
  // workspace row is enough to clean everything up.
  await prisma.workspace.delete({ where: { id: workspaceId } });

  return NextResponse.json({ success: true });
}