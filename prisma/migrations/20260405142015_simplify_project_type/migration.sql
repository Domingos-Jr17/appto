-- Restore ProjectType enum with 3 values: SCHOOL_WORK, PRACTICAL_WORK, RESEARCH_WORK
-- Maps all old types to the new simplified set

-- Step 1: Create the new enum
CREATE TYPE "ProjectType_new" AS ENUM ('SCHOOL_WORK', 'PRACTICAL_WORK', 'RESEARCH_WORK');

-- Step 2: Migrate projects table
ALTER TABLE "public"."projects" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "public"."projects" ALTER COLUMN "type" TYPE "ProjectType_new" USING (
  CASE
    WHEN "type"::text = 'SCHOOL_WORK' THEN 'SCHOOL_WORK'::"ProjectType_new"
    WHEN "type"::text = 'RESEARCH_PROJECT' THEN 'SCHOOL_WORK'::"ProjectType_new"
    WHEN "type"::text = 'PRACTICAL_WORK' THEN 'PRACTICAL_WORK'::"ProjectType_new"
    WHEN "type"::text = 'INTERNSHIP_REPORT' THEN 'PRACTICAL_WORK'::"ProjectType_new"
    WHEN "type"::text = 'TCC' THEN 'PRACTICAL_WORK'::"ProjectType_new"
    ELSE 'RESEARCH_WORK'::"ProjectType_new"
  END
);
ALTER TABLE "public"."projects" ALTER COLUMN "type" SET DEFAULT 'RESEARCH_WORK'::"ProjectType_new";

-- Step 3: Migrate project_briefs table (mapped as "project_briefs" in schema)
ALTER TABLE "public"."project_briefs" ALTER COLUMN "workType" TYPE "ProjectType_new" USING (
  CASE
    WHEN "workType"::text = 'SCHOOL_WORK' THEN 'SCHOOL_WORK'::"ProjectType_new"
    WHEN "workType"::text = 'RESEARCH_PROJECT' THEN 'SCHOOL_WORK'::"ProjectType_new"
    WHEN "workType"::text = 'PRACTICAL_WORK' THEN 'PRACTICAL_WORK'::"ProjectType_new"
    WHEN "workType"::text = 'INTERNSHIP_REPORT' THEN 'PRACTICAL_WORK'::"ProjectType_new"
    WHEN "workType"::text = 'TCC' THEN 'PRACTICAL_WORK'::"ProjectType_new"
    ELSE 'RESEARCH_WORK'::"ProjectType_new"
  END
);

-- Step 4: Drop old enum and rename
DROP TYPE "ProjectType";
ALTER TYPE "ProjectType_new" RENAME TO "ProjectType";
