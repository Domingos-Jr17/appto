import { db } from "@/lib/db";
import { WorkBriefInput } from "@/types/editor";

export interface GenerationJobInput {
  projectId: string;
  userId: string;
  title: string;
  type: string;
  brief: WorkBriefInput;
  contentCost: number;
  baseCost: number;
}

export async function getGenerationJobByProject(projectId: string) {
  return db.generationJob.findUnique({
    where: { projectId },
  });
}

export async function createGenerationJob(input: GenerationJobInput) {
  const job = await db.generationJob.create({
    data: {
      projectId: input.projectId,
      userId: input.userId,
      status: "BRIEFING",
    },
  });
  
  return job;
}

export async function updateGenerationJobStatus(
  jobId: string,
  status: "BRIEFING" | "QUEUED" | "GENERATING" | "READY" | "FAILED" | "NEEDS_REVIEW"
) {
  return db.generationJob.update({
    where: { id: jobId },
    data: { status },
  });
}