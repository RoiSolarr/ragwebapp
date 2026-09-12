-- Add persisted retrieval citations to assistant chat messages.
ALTER TABLE "ChatMessage" ADD COLUMN "sources" JSONB;
