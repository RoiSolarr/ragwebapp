import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceMembership } from "@/lib/workspace-access";
import { ingestDocument, MAX_FILE_SIZE_BYTES, UploadValidationError } from "@/lib/documents/ingest";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`upload:${user.id}:${getRequestIp(request)}`, 10, 60 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Upload limit reached. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });
  }

  const workspaceId = formData.get("workspaceId");
  const file = formData.get("file");

  if (typeof workspaceId !== "string" || !workspaceId) {
    return NextResponse.json({ error: "A workspace is required" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: "Files must be 10MB or smaller." }, { status: 400 });
  }

  const membership = await getWorkspaceMembership(workspaceId, user.id);
  if (!membership) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  if (membership.role === "VIEWER") {
    return NextResponse.json({ error: "Viewers can't upload documents to this workspace." }, { status: 403 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const document = await ingestDocument({
      workspaceId,
      fileName: file.name,
      mimeType: file.type,
      buffer,
    });

    return NextResponse.json({ document });
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Document upload error:", error);
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}
