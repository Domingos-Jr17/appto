import type {
  EditorialStatus,
  LastEditedSection,
  SectionSummary,
  WorkspaceMode,
} from "@/types/editor";

export type WorkspaceSectionLike = {
  id: string;
  title: string;
  wordCount: number;
  parentId: string | null;
  updatedAt: string | Date;
};

const STALE_DAYS = 14;

export function isChapterSection(section: WorkspaceSectionLike) {
  return section.parentId === null;
}

export function getEditorialStatus(section: WorkspaceSectionLike): EditorialStatus {
  const words = section.wordCount || 0;
  if (words === 0) return "empty";

  const updatedAt = new Date(section.updatedAt);
  const staleBoundary = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000;
  if (!Number.isNaN(updatedAt.getTime()) && updatedAt.getTime() < staleBoundary) {
    return "stale";
  }

  const isChapter = isChapterSection(section);
  const startedMax = 179;
  const draftingMax = isChapter ? 799 : 399;

  if (words <= startedMax) return "started";
  if (words <= draftingMax) return "drafting";
  return "review";
}

export function getSectionSummary(sections: WorkspaceSectionLike[]): SectionSummary {
  return sections.reduce<SectionSummary>(
    (summary, section) => {
      summary[getEditorialStatus(section)] += 1;
      return summary;
    },
    {
      empty: 0,
      started: 0,
      drafting: 0,
      review: 0,
      stale: 0,
    }
  );
}

export function getLastEditedSection(
  sections: WorkspaceSectionLike[]
): LastEditedSection | null {
  if (sections.length === 0) return null;

  const latest = [...sections]
    .filter((section) => section.wordCount > 0)
    .sort((left, right) => {
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    })[0];

  if (!latest) return null;

  return {
    id: latest.id,
    title: latest.title,
    updatedAt: new Date(latest.updatedAt).toISOString(),
  };
}

export function getResumeMode(
  project: {
    wordCount: number;
    sections: WorkspaceSectionLike[];
  },
  lastEditedSection: LastEditedSection | null
): WorkspaceMode {
  if (project.sections.length > 0 && project.wordCount <= 0) return "document";
  if (lastEditedSection) return "document";
  return "structure";
}
