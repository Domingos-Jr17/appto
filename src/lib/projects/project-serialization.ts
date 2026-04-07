import { normalizeStoredContent } from "@/lib/content";
import { getWorkGenerationStatusAsync } from "@/lib/work-generation-jobs";
import { serializeProjectBrief } from "@/lib/projects/project-brief";
import { resolveGenerationSnapshot } from "@/lib/work-generation-state";
import { getLastEditedSection, getResumeMode, getSectionSummary } from "@/lib/workspace";

export function buildGenerationMap(
  input: Map<string, { status: string; progress: number; step: string }>,
) {
  return new Map(input);
}

export function serializeProjectListItem(
  project: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    status: string;
    wordCount: number;
    updatedAt: Date;
    createdAt: Date;
    sections: {
      id: string;
      title: string;
      parentId: string | null;
      order: number;
      wordCount: number;
      updatedAt: Date;
    }[];
    brief: Parameters<typeof serializeProjectBrief>[0] | null;
  },
  generationStatusMap: Map<string, { status: string; progress: number; step: string }>,
) {
  const liveGeneration = generationStatusMap.get(project.id);
  const generationSnapshot = resolveGenerationSnapshot({
    liveJob: liveGeneration,
    fallbackStatus: project.brief?.generationStatus,
  });

  return {
    ...project,
    brief: serializeProjectBrief(project.brief),
    generationStatus: generationSnapshot.status,
    generationProgress: generationSnapshot.progress,
    generationStep: generationSnapshot.step,
    resumeMode: getResumeMode(project, getLastEditedSection(project.sections)),
    lastEditedSection: getLastEditedSection(project.sections),
    sectionSummary: getSectionSummary(project.sections),
  };
}

export async function serializeProjectDetail(project: {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
  sections: {
    id: string;
    title: string;
    content: string | null;
    order: number;
    wordCount: number;
    parentId: string | null;
    updatedAt: Date;
  }[];
  brief: Parameters<typeof serializeProjectBrief>[0] | null;
}) {
  const sections = project.sections.map((section) => ({
    ...section,
    content: normalizeStoredContent(section.content),
  }));
  const lastEditedSection = getLastEditedSection(sections);
  const generationSnapshot = resolveGenerationSnapshot({
    liveJob: await getWorkGenerationStatusAsync(project.id),
    fallbackStatus: project.brief?.generationStatus,
  });

  return {
    ...project,
    sections,
    brief: serializeProjectBrief(project.brief),
    generationStatus: generationSnapshot.status,
    generationProgress: generationSnapshot.progress,
    generationStep: generationSnapshot.step,
    resumeMode: getResumeMode(project, lastEditedSection),
    lastEditedSection,
    sectionSummary: getSectionSummary(sections),
  };
}
