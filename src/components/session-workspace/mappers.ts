import type { AssistantMessage, Project, Section } from "@/types/editor";
import type { WorkspaceArtifactSource } from "./types";
import { flattenSections } from "@/lib/editor-helpers";
import { DEFAULT_PROJECT_SECTIONS } from "@/lib/project-templates";

function isSectionEditable(sectionTitle: string): boolean {
  return DEFAULT_PROJECT_SECTIONS.some(
    (tpl) => tpl.title === sectionTitle && tpl.isPrimaryEditable
  );
}

export function getPreferredSectionId(project: Project | null, sections: Section[]): string | null {
  if (!sections.length) return project?.lastEditedSection?.id || null;

  if (project?.lastEditedSection?.id) {
    const match = sections.find((s) => s.id === project.lastEditedSection!.id);
    if (match) return match.id;
  }

  const flat = flattenSections(sections);
  for (const section of flat) {
    if (isSectionEditable(section.title)) {
      return section.id;
    }
  }

  return sections[0]?.id || null;
}

export function buildArtifactSource(
  project: Project,
  activeSection: Section | null,
  chatMessages: AssistantMessage[]
): WorkspaceArtifactSource {
  if (activeSection) {
    return {
      title: activeSection.title,
      subtitle: activeSection.content.trim()
        ? `${activeSection.wordCount.toLocaleString("pt-MZ")} palavras na secção activa`
        : "Secção activa pronta para receber conteúdo",
      content: activeSection.content,
      empty: activeSection.content.trim().length === 0,
      source: "section",
    };
  }

  const lastAssistantMessage = [...chatMessages]
    .reverse()
    .find((message) => message.role === "assistant" && message.content.trim());

  if (lastAssistantMessage) {
    return {
      title: "Documento em desenvolvimento",
      subtitle: "Última proposta gerada pelo assistente",
      content: lastAssistantMessage.content,
      empty: false,
      source: "assistant",
    };
  }

  return {
    title: project.title,
    subtitle: "Resumo inicial do trabalho",
    content:
      project.description?.trim() ||
      "Este trabalho ainda nao tem documento em desenvolvimento. Comece pelo briefing ou seleccione uma secao para visualizar aqui.",
    empty: !(project.description?.trim()),
    source: "project",
  };
}
