-- CreateEnum
CREATE TYPE "WorkGenerationStatus" AS ENUM ('BRIEFING', 'GENERATING', 'READY', 'NEEDS_REVIEW', 'FAILED');

-- CreateEnum
CREATE TYPE "CitationStyle" AS ENUM ('ABNT', 'APA', 'Vancouver');

-- CreateTable
CREATE TABLE "project_briefs" (
    "projectId" TEXT NOT NULL,
    "workType" "ProjectType" NOT NULL,
    "generationStatus" "WorkGenerationStatus" NOT NULL DEFAULT 'BRIEFING',
    "institutionName" TEXT,
    "courseName" TEXT,
    "subjectName" TEXT,
    "educationLevel" "EducationLevel",
    "advisorName" TEXT,
    "studentName" TEXT,
    "city" TEXT,
    "academicYear" INTEGER,
    "dueDate" DATE,
    "theme" TEXT,
    "subtitle" TEXT,
    "objective" TEXT,
    "researchQuestion" TEXT,
    "methodology" TEXT,
    "keywords" TEXT,
    "referencesSeed" TEXT,
    "citationStyle" "CitationStyle" NOT NULL DEFAULT 'ABNT',
    "language" TEXT NOT NULL DEFAULT 'pt-MZ',
    "additionalInstructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_briefs_pkey" PRIMARY KEY ("projectId")
);

-- CreateIndex
CREATE INDEX "project_briefs_generationStatus_idx" ON "project_briefs"("generationStatus");

-- AddForeignKey
ALTER TABLE "project_briefs" ADD CONSTRAINT "project_briefs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
