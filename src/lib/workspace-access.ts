import { prisma } from "@/lib/prisma";

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export type WorkspaceMembership = {
  id: string;
  name: string;
  type: string;
  role: WorkspaceRole;
};

/**
 * Returns the workspace + the caller's role in it, or null if the workspace
 * doesn't exist or the user isn't a member. Callers should treat null as a
 * 404, not a 403, so we don't leak whether a workspace id exists.
 */
export async function getWorkspaceMembership(
  workspaceId: string,
  userId: string
): Promise<WorkspaceMembership | null> {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
    include: { workspace: true },
  });

  if (!membership) return null;

  return {
    id: membership.workspace.id,
    name: membership.workspace.name,
    type: membership.workspace.type,
    role: membership.role,
  };
}
