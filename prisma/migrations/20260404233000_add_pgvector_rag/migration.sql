CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE knowledge_chunks
ADD COLUMN IF NOT EXISTS embedding_vector vector(128);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_vector
ON knowledge_chunks
USING ivfflat (embedding_vector vector_cosine_ops)
WITH (lists = 100);
