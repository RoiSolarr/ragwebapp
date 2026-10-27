import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceMembership } from "@/lib/workspace-access";

export const runtime = "nodejs";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, workspaceId: true },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const membership = await getWorkspaceMembership(document.workspaceId, user.id);
  if (!membership) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (membership.role === "VIEWER") {
    return NextResponse.json({ error: "Viewers can't remove documents from this workspace." }, { status: 403 });
  }

  await prisma.document.delete({ where: { id: document.id } });
  return NextResponse.json({ success: true });
}
