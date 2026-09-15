import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceMembership } from "@/lib/workspace-access";
import { getEmbedding } from "@/lib/ai/embeddings";
import { generateRAGAnswer, RAGGenerationError } from "@/lib/ai/chat";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Chat generation retries with backoff and can take longer than the
// platform default timeout. Set this to whatever your plan allows
// (Hobby currently caps at 60; Pro allows more).
export const maxDuration = 60;

const MAX_QUESTION_LENGTH = 2000;
const TOP_K = 6;

type RetrievedChunk = {
  id: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  content: string;
  distance: number;
};

type ChatHistoryMessage = {
  id: string;
  role: string;
  content: string;
  sources: unknown;
  createdAt: Date;
};

async function getAuthenticatedWorkspace(workspaceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, membership: null };
  const membership = await getWorkspaceMembership(workspaceId, user.id);
  return { user, membership };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const { user, membership } = await getAuthenticatedWorkspace(workspaceId);

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!membership) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const messages = await prisma.chatMessage.findMany({
    where: { workspaceId, userId: user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, content: true, sources: true, createdAt: true },
  });

  return NextResponse.json({
    messages: messages.map((message: ChatHistoryMessage) => ({ ...message, createdAt: message.createdAt.toISOString() })),
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const { user, membership } = await getAuthenticatedWorkspace(workspaceId);

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!membership) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const rateLimit = await checkRateLimit(
  `chat:${user.id}:${getRequestIp(request)}`,
  30,
  60 * 60 * 1000,
);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Chat limit reached. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const rawQuestion = (body as { question?: unknown } | null)?.question;
  const question = typeof rawQuestion === "string" ? rawQuestion.trim() : "";

  if (!question) return NextResponse.json({ error: "A question is required" }, { status: 400 });
  if (question.length > MAX_QUESTION_LENGTH) return NextResponse.json({ error: "That question is too long." }, { status: 400 });

  const userMessage = await prisma.chatMessage.create({
    data: { workspaceId, userId: user.id, role: "user", content: question },
  });

  let queryEmbedding: number[];
  try {
    queryEmbedding = await getEmbedding(question, "RETRIEVAL_QUERY");
  } catch (error) {
    console.error("Embedding error:", error);
    await prisma.chatMessage.delete({ where: { id: userMessage.id } });
    return NextResponse.json({ error: "Failed to process the question. Please try again." }, { status: 502 });
  }

  if (queryEmbedding.length === 0) {
    await prisma.chatMessage.delete({ where: { id: userMessage.id } });
    return NextResponse.json({ error: "Failed to process the question. Please try again." }, { status: 502 });
  }

  const vectorString = `[${queryEmbedding.join(",")}]`;
  const chunks = await prisma.$queryRaw<RetrievedChunk[]>`
    SELECT dc.id, dc."documentId", d.name AS "documentName", dc."chunkIndex", dc.content,
           dc.embedding <=> ${vectorString}::vector AS distance
    FROM "DocumentChunk" dc
    JOIN "Document" d ON d.id = dc."documentId"
    WHERE d."workspaceId" = ${workspaceId}::uuid AND d.status = 'COMPLETED'
    ORDER BY distance ASC
    LIMIT ${TOP_K};
  `;

  let answer: string;
  if (chunks.length === 0) {
    answer = "I don't have any indexed documents in this workspace yet. Upload a document to get started.";
  } else {
    const context = chunks
      .map((chunk: RetrievedChunk, index: number) => `[${index + 1}] (${chunk.documentName})\n${chunk.content}`)
      .join("\n\n");

    try {
      answer = await generateRAGAnswer(question, context);
    } catch (error) {
      console.error("Chat generation error:", error);
      await prisma.chatMessage.delete({ where: { id: userMessage.id } });

      if (error instanceof RAGGenerationError) {
        // 429 -> transient, worth the client retrying shortly.
        // 503 -> not going to recover within this request (e.g. a daily quota).
        const headers: Record<string, string> = {};
        if (error.retryAfterSeconds && Number.isFinite(error.retryAfterSeconds)) {
          headers["Retry-After"] = String(Math.ceil(error.retryAfterSeconds));
        }

        return NextResponse.json(
          { error: error.message },
          { status: error.retryable ? 429 : 503, headers },
        );
      }

      return NextResponse.json({ error: "Failed to generate an answer. Please try again." }, { status: 502 });
    }
  }

  const sources = chunks.map((chunk: RetrievedChunk, index: number) => ({
    index: index + 1,
    documentId: chunk.documentId,
    documentName: chunk.documentName,
    chunkId: chunk.id,
    content: chunk.content,
  }));

  await prisma.chatMessage.create({
    data: { workspaceId, userId: user.id, role: "assistant", content: answer, sources },
  });

  return NextResponse.json({
    answer,
    sources,
  });
}