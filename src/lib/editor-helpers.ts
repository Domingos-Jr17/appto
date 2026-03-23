import type {
  AutoSaveStatus,
  FlatSection,
  Project,
  Section,
  WorkspaceMode,
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

export function extractOutlineTitles(content: string): string[] {
  return content
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").replace(/^\d+[).]?\s*/, "").trim())
    .filter((line) => line.length > 3)
    .slice(0, 8);
}

export function inferSectionTitle(content: string): string {
  const firstLine = content.split("\n").map((line) => line.trim()).find(Boolean);
  return firstLine ? firstLine.replace(/^#+\s*/, "").slice(0, 72) : "Nova secao";
}

export function getSaveCopy(status: AutoSaveStatus, lastSaved?: Date): string {
  if (status === "saving") return "A guardar...";
  if (status === "error") return "Falha ao guardar";
  if (!lastSaved) return "Sem alteracoes";
  return `Guardado ${lastSaved.toLocaleTimeString("pt-MZ", { hour: "2-digit", minute: "2-digit" })}`;
}

export function getModeDescription(mode: WorkspaceMode): string {
  if (mode === "chat") return "Conversa principal com a IA para gerar, alinhar e decidir o proximo passo.";
  if (mode === "document") return "Editor central em Markdown com foco na secao activa.";
  return "Plano editorial do projecto com hierarquia, ordem e estado inferido.";
}

export function formatStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: "Rascunho",
    IN_PROGRESS: "Em curso",
    REVIEW: "Em revisao",
    COMPLETED: "Concluido",
    ARCHIVED: "Arquivado",
  };

  return labels[status] || status;
}

export function formatProjectType(type: string): string {
  return type
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function countTreeSections(sections: Section[]): number {
  return sections.reduce((total, section) => total + 1 + countTreeSections(section.children), 0);
}

export function formatRelativeDate(value?: string): string {
  if (!value) return "sem actividade recente";

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffHours < 1) return "agora mesmo";
  if (diffHours < 24) return `ha ${diffHours}h`;
  if (diffDays < 7) return `ha ${diffDays}d`;

  return date.toLocaleDateString("pt-MZ", {
    day: "2-digit",
    month: "short",
  });
}

export function getNextActionCopy(project: Project, activeSection: Section | null): string {
  if (!project.sections.length) {
    return "Gerar outline no chat e abrir a primeira secao.";
  }

  if (!project.wordCount) {
    return "Aprovar a estrutura e iniciar a primeira secao.";
  }

  if (activeSection && activeSection.wordCount === 0) {
    return `Escrever a secao "${activeSection.title}".`;
  }

  if (project.sectionSummary.review > 0) {
    return "Rever secoes prontas e exportar uma nova versao.";
  }

  return "Continuar a secao activa ou pedir refinamento no chat.";
}
