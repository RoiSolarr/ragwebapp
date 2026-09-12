export type DocumentStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export type DocumentSummary = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  error: string | null;
  createdAt: string;
};

export type ChatSource = {
  index: number;
  documentId: string;
  documentName: string;
  chunkId: string;
  content: string;
};