ALTER TABLE "generation_jobs"
ADD COLUMN     "currentRunId" TEXT;

CREATE TABLE "generation_runs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "step" TEXT,
    "error" TEXT,
    "trigger" TEXT NOT NULL DEFAULT 'USER_REQUEST',
    "activeSectionKey" TEXT,
    "currentAttemptId" TEXT,
    "currentAttemptNumber" INTEGER NOT NULL DEFAULT 1,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generation_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "generation_attempts" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "trigger" TEXT NOT NULL DEFAULT 'INITIAL',
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generation_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "section_runs" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "sectionId" TEXT,
    "stableKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "lastContentPreview" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastPersistedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "section_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "generation_attempts_runId_attemptNumber_key" ON "generation_attempts"("runId", "attemptNumber");
CREATE UNIQUE INDEX "section_runs_attemptId_stableKey_key" ON "section_runs"("attemptId", "stableKey");
CREATE INDEX "generation_runs_projectId_status_createdAt_idx" ON "generation_runs"("projectId", "status", "createdAt");
CREATE INDEX "generation_runs_userId_createdAt_idx" ON "generation_runs"("userId", "createdAt");
CREATE INDEX "generation_attempts_runId_status_createdAt_idx" ON "generation_attempts"("runId", "status", "createdAt");
CREATE INDEX "section_runs_runId_stableKey_idx" ON "section_runs"("runId", "stableKey");
CREATE INDEX "section_runs_sectionId_idx" ON "section_runs"("sectionId");

ALTER TABLE "generation_jobs"
ADD CONSTRAINT "generation_jobs_currentRunId_fkey"
FOREIGN KEY ("currentRunId") REFERENCES "generation_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "generation_runs"
ADD CONSTRAINT "generation_runs_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "generation_runs"
ADD CONSTRAINT "generation_runs_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "generation_runs"
ADD CONSTRAINT "generation_runs_currentAttemptId_fkey"
FOREIGN KEY ("currentAttemptId") REFERENCES "generation_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "generation_attempts"
ADD CONSTRAINT "generation_attempts_runId_fkey"
FOREIGN KEY ("runId") REFERENCES "generation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "generation_attempts"
ADD CONSTRAINT "generation_attempts_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "section_runs"
ADD CONSTRAINT "section_runs_runId_fkey"
FOREIGN KEY ("runId") REFERENCES "generation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "section_runs"
ADD CONSTRAINT "section_runs_attemptId_fkey"
FOREIGN KEY ("attemptId") REFERENCES "generation_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "section_runs"
ADD CONSTRAINT "section_runs_sectionId_fkey"
FOREIGN KEY ("sectionId") REFERENCES "document_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
