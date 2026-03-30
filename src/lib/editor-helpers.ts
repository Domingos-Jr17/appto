import type {
  AutoSaveStatus,
  FlatSection,
  Project,
  Section,
} from "@/types/editor";
import { getEditorialStatus, getLastEditedSection, getResumeMode, getSectionSummary } from "@/lib/workspace";

export function deriveSection(
  section: Omit<Section, "editorialStatus" | "children"> & { children?: Section[] }
): Section {
  return {
    ...section,
    editorialStatus: getEditorialStatus(section),
    children: (section.children || []).map(deriveSection),
  };
}

export function normalizeSectionTree(sections: Section[], parentId: string | null = null): Section[] {
  return sections.map((section, index) => {
    const children = normalizeSectionTree(section.children || [], section.id);

    return deriveSection({
      ...section,
      parentId,
      order: index + 1,
      children,
    });
  });
}

export function buildSectionTree(sections: Project["sections"]): Section[] {
  const sectionMap = new Map<string, Section>();
  const roots: Section[] = [];

  [...sections]
    .sort((left, right) => left.order - right.order)
    .forEach((section) => {
      sectionMap.set(
        section.id,
        deriveSection({
          id: section.id,
          title: section.title,
          type: section.parentId ? "section" : "chapter",
          parentId: section.parentId,
          order: section.order,
          updatedAt: section.updatedAt,
          wordCount: section.wordCount,
          content: section.content || "",
          children: [],
        })
      );
    });

  [...sections]
    .sort((left, right) => left.order - right.order)
    .forEach((section) => {
      const current = sectionMap.get(section.id);
      if (!current) return;

      if (section.parentId) {
        const parent = sectionMap.get(section.parentId);
        if (parent) {
          parent.children.push(current);
        }
      } else {
        roots.push(current);
      }
    });

  return normalizeSectionTree(roots);
}

export function flattenSections(sections: Section[], parentId: string | null = null): FlatSection[] {
  return sections.flatMap((section, index) => {
    const current: FlatSection = {
      id: section.id,
      title: section.title,
      content: section.content,
      order: index + 1,
      wordCount: section.wordCount,
      parentId,
      updatedAt: section.updatedAt,
    };

    return [current, ...flattenSections(section.children || [], section.id)];
  });
}

export function findSectionById(sectionId: string, sections: Section[]): Section | null {
  for (const section of sections) {
    if (section.id === sectionId) return section;
    const nested = findSectionById(sectionId, section.children || []);
    if (nested) return nested;
  }
  return null;
}

export function updateTree(
  sections: Section[],
  sectionId: string,
  updater: (section: Section) => Section
): Section[] {
  return sections.map((section) => {
    if (section.id === sectionId) return updater(section);
    if (section.children.length > 0) {
      return { ...section, children: updateTree(section.children, sectionId, updater) };
    }
    return section;
  });
}

export function removeTree(sections: Section[], sectionId: string): Section[] {
  return sections
    .filter((section) => section.id !== sectionId)
    .map((section) => ({
      ...section,
      children: removeTree(section.children || [], sectionId),
    }));
}

export function insertTree(sections: Section[], section: Section, parentId?: string | null): Section[] {
  if (!parentId) return normalizeSectionTree([...sections, section]);

  return normalizeSectionTree(
    sections.map((item) => {
      if (item.id === parentId) {
        return { ...item, children: [...(item.children || []), section] };
      }
      if (item.children.length > 0) {
        return { ...item, children: insertTree(item.children, section, parentId) };
      }
      return item;
    })
  );
}

export function syncProjectWithTree(project: Project, tree: Section[]): Project {
  const flatSections = flattenSections(normalizeSectionTree(tree));
  const sectionSummary = getSectionSummary(flatSections);
  const lastEditedSection = getLastEditedSection(flatSections);
  const wordCount = flatSections.reduce((total, section) => total + section.wordCount, 0);

  return {
    ...project,
    wordCount,
    sections: flatSections,
    sectionSummary,
    lastEditedSection,
    resumeMode: getResumeMode({ wordCount, sections: flatSections }, lastEditedSection),
  };
}



export function getSaveCopy(status: AutoSaveStatus, lastSaved?: Date): string {
  if (status === "saving") return "A guardar...";
  if (status === "error") return "Falha ao guardar";
  if (!lastSaved) return "Sem alteracoes";
  return `Guardado ${lastSaved.toLocaleTimeString("pt-MZ", { hour: "2-digit", minute: "2-digit" })}`;
}



export function countTreeSections(sections: Section[]): number {
  return sections.reduce((total, section) => total + 1 + countTreeSections(section.children), 0);
}


