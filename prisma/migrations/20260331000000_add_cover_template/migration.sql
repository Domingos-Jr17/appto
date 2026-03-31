-- CreateEnum
CREATE TYPE "CoverTemplate" AS ENUM ('UEM_STANDARD', 'UCM_STANDARD', 'ISRI', 'ABNT_GENERIC', 'MODERNA', 'CLASSICA');

-- AlterTable
ALTER TABLE "project_briefs" ADD COLUMN "coverTemplate" "CoverTemplate" NOT NULL DEFAULT 'UEM_STANDARD';
