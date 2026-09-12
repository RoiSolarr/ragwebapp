import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEmbedding } from "@/lib/ai/embeddings";

export async function POST(req: Request) {
  try {
    const { workspaceId, name, mimeType, sizeBytes, storagePath, chunks } = await req.json();

    if (!workspaceId || !name || !mimeType || !storagePath || !Array.isArray(chunks)) {
      return NextResponse.json({ error: "Invalid document payload" }, { status: 400 });
    }

    const document = await prisma.document.create({
      data: { workspaceId, name, mimeType, sizeBytes: sizeBytes ?? 0, storagePath },
    });

    for (const [chunkIndex, chunkText] of chunks.entries()) {
      const embedding = await getEmbedding(chunkText);
      const vectorString = `[${embedding.join(",")}]`;

      const chunk = await prisma.documentChunk.create({
        data: {
          documentId: document.id,
          content: chunkText,
          chunkIndex,
        },
      });

      await prisma.$executeRaw`
        UPDATE "DocumentChunk"
        SET "embedding" = ${vectorString}::vector
        WHERE id = ${chunk.id}::uuid;
      `;
    }

    return NextResponse.json({ success: true, documentId: document.id });
  } catch (error) {
    console.error("Ingestion Error:", error);
    return NextResponse.json({ error: "Failed to process document" }, { status: 500 });
  }
}