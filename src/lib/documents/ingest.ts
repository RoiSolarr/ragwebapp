import { prisma } from "@/lib/prisma";
import { getEmbedding } from "@/lib/ai/embeddings";
import { chunkText } from "@/lib/documents/chunk-text";
import { extractText, resolveDocumentType, validateDocumentBuffer } from "@/lib/documents/extract-text";

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export class UploadValidationError extends Error {}

type IngestDocumentInput = {
  workspaceId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
};

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(0, 120);
}

export async function ingestDocument({ workspaceId, fileName, mimeType, buffer }: IngestDocumentInput) {
  if (buffer.byteLength === 0) throw new UploadValidationError("That file is empty.");
  if (buffer.byteLength > MAX_FILE_SIZE_BYTES) throw new UploadValidationError("Files must be 10MB or smaller.");

  const documentType = resolveDocumentType(fileName, mimeType);
  if (!documentType) throw new UploadValidationError("Only PDF, Markdown, and plain text files are supported.");
  if (!validateDocumentBuffer(buffer, documentType)) {
    throw new UploadValidationError("The file contents do not match the selected document type.");
  }

  const document = await prisma.document.create({
    data: {
      workspaceId,
      name: fileName,
      mimeType: mimeType || documentType,
      sizeBytes: buffer.byteLength,
      storagePath: `workspaces/${workspaceId}/${Date.now()}-${sanitizeFileName(fileName)}`,
      status: "PROCESSING",
    },
  });

  try {
    const text = await extractText(buffer, documentType);
    const chunks = chunkText(text);
    if (chunks.length === 0) throw new Error("No readable text was found in this file.");

    for (const [chunkIndex, content] of chunks.entries()) {
      const embedding = await getEmbedding(content, "RETRIEVAL_DOCUMENT");
      if (embedding.length === 0) throw new Error("Failed to generate embeddings for this document.");

      const vectorString = `[${embedding.join(",")}]`;
      const chunk = await prisma.documentChunk.create({
        data: {
          documentId: document.id,
          content,
          chunkIndex,
          tokenCount: Math.ceil(content.length / 4),
        },
      });

      await prisma.$executeRaw`
        UPDATE "DocumentChunk"
        SET "embedding" = ${vectorString}::vector
        WHERE id = ${chunk.id}::uuid;
      `;
    }

    return await prisma.document.update({
      where: { id: document.id },
      data: { status: "COMPLETED", error: null },
    });
  } catch (error) {
    console.error(`Failed to process document ${document.id}:`, error);
    await prisma.documentChunk.deleteMany({ where: { documentId: document.id } });
    return prisma.document.update({
      where: { id: document.id },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Failed to process document.",
      },
    });
  }
}
