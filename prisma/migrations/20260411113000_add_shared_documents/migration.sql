CREATE TABLE IF NOT EXISTS shared_documents (
  id TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expiresAt" TIMESTAMPTZ,
  views INTEGER NOT NULL DEFAULT 0,
  "lastViewedAt" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_shared_documents_token
  ON shared_documents (token);

CREATE INDEX IF NOT EXISTS idx_shared_documents_project_active
  ON shared_documents ("projectId", "isActive");
