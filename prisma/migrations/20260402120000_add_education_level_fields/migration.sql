-- AlterTable: Add education-level specific fields to project_briefs
ALTER TABLE "project_briefs" ADD COLUMN "className" VARCHAR(30);
ALTER TABLE "project_briefs" ADD COLUMN "turma" VARCHAR(10);
ALTER TABLE "project_briefs" ADD COLUMN "facultyName" VARCHAR(180);
ALTER TABLE "project_briefs" ADD COLUMN "departmentName" VARCHAR(180);
ALTER TABLE "project_briefs" ADD COLUMN "studentNumber" VARCHAR(30);
ALTER TABLE "project_briefs" ADD COLUMN "semester" VARCHAR(10);
