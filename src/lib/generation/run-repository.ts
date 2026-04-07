import { db } from "@/lib/db";
import {
  buildTrackedSections,
  type GenerationAttemptStatus,
  type GenerationRunStatus,
  type GenerationTrackedSection,
  type SectionRunStatus,
} from "@/lib/generation/run-domain";

type RunStateInput = {
  status?: GenerationRunStatus;
  progress?: number;
  step?: string | null;
  error?: string | null;
  activeSectionKey?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
};

type AttemptStateInput = {
  status?: GenerationAttemptStatus;
  trigger?: string;
  error?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
};

type SectionStateInput = {
  stableKey: string;
  title: string;
  order: number;
  sectionId?: string | null;
  status: SectionRunStatus;
  progress: number;
  retryCount?: number;
  wordCount?: number;
  lastContentPreview?: string | null;
  error?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  lastPersistedAt?: Date | null;
};

export async function createGenerationRun(input: {
  projectId: string;
  userId: string;
  trigger?: string;
  sections: GenerationTrackedSection[];
}) {
  const trackedSections = buildTrackedSections(input.sections);

  return db.$transaction(async (tx) => {
    const run = await tx.generationRun.create({
      data: {
        projectId: input.projectId,
        userId: input.userId,
        trigger: input.trigger ?? "USER_REQUEST",
        status: "QUEUED",
        progress: 5,
        step: "Na fila do worker",
      },
    });

    const attempt = await tx.generationAttempt.create({
      data: {
        runId: run.id,
        userId: input.userId,
        attemptNumber: 1,
        status: "QUEUED",
        trigger: "INITIAL",
      },
    });

    await tx.generationRun.update({
      where: { id: run.id },
      data: {
        currentAttemptId: attempt.id,
        currentAttemptNumber: 1,
      },
    });

    if (trackedSections.length > 0) {
      await tx.sectionRun.createMany({
        data: trackedSections.map((section) => ({
          runId: run.id,
          attemptId: attempt.id,
          sectionId: section.sectionId,
          stableKey: section.stableKey,
          title: section.title,
          order: section.order,
          status: "PENDING",
          progress: 0,
        })),
      });
    }

    return { runId: run.id, attemptId: attempt.id, trackedSections };
  });
}

export async function createGenerationRetryAttempt(input: {
  runId: string;
  userId: string;
  trigger: string;
}) {
  const run = await db.generationRun.findUnique({
    where: { id: input.runId },
    include: {
      currentAttempt: {
        include: {
          sectionRuns: {
            select: {
              sectionId: true,
              stableKey: true,
              title: true,
              order: true,
            },
          },
        },
      },
    },
  });

  if (!run) {
    throw new Error("Generation run not found for retry");
  }

  const attemptNumber = run.currentAttemptNumber + 1;
  const sections = run.currentAttempt?.sectionRuns ?? [];

  return db.$transaction(async (tx) => {
    const attempt = await tx.generationAttempt.create({
      data: {
        runId: input.runId,
        userId: input.userId,
        attemptNumber,
        status: "QUEUED",
        trigger: input.trigger,
      },
    });

    if (sections.length > 0) {
      await tx.sectionRun.createMany({
        data: sections.map((section) => ({
          runId: input.runId,
          attemptId: attempt.id,
          sectionId: section.sectionId,
          stableKey: section.stableKey,
          title: section.title,
          order: section.order,
          status: "PENDING",
          progress: 0,
        })),
      });
    }

    await tx.generationRun.update({
      where: { id: input.runId },
      data: {
        currentAttemptId: attempt.id,
        currentAttemptNumber: attemptNumber,
        status: "QUEUED",
        progress: 5,
        step: "Retentativa automática em fila",
        error: null,
        completedAt: null,
      },
    });

    return { attemptId: attempt.id, attemptNumber };
  });
}

export async function updateGenerationRunState(runId: string, state: RunStateInput) {
  await db.generationRun.update({
    where: { id: runId },
    data: state,
  });
}

export async function updateGenerationAttemptState(attemptId: string, state: AttemptStateInput) {
  await db.generationAttempt.update({
    where: { id: attemptId },
    data: state,
  });
}

export async function updateSectionRunState(attemptId: string, state: SectionStateInput) {
  await db.sectionRun.update({
    where: {
      attemptId_stableKey: {
        attemptId,
        stableKey: state.stableKey,
      },
    },
    data: state,
  });
}

export async function getPersistedGenerationSnapshot(projectId: string) {
  const job = await db.generationJob.findUnique({
    where: { projectId },
    select: {
      projectId: true,
      status: true,
      progress: true,
      step: true,
      error: true,
      run: {
        select: {
          activeSectionKey: true,
          currentAttempt: {
            select: {
              sectionRuns: {
                where: { status: "STREAMING" },
                orderBy: { updatedAt: "desc" },
                take: 1,
                select: {
                  title: true,
                  lastContentPreview: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!job) {
    return null;
  }

  const activeSection = job.run?.currentAttempt?.sectionRuns[0];

  return {
    projectId: job.projectId,
    status: job.status,
    progress: job.progress,
    step: job.step,
    error: job.error,
    streamingSectionTitle: activeSection?.title,
    streamingContent: activeSection?.lastContentPreview,
  };
}
