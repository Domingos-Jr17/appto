import type { AssistantMessage, Project, Section } from "@/types/editor";
import type {
  PersistedWorkspaceConversation,
  WorkspaceArtifactSource,
  WorkspaceConversationItem,
} from "./workspace-types";
import { flattenSections } from "@/lib/editor-helpers";

const MAX_CONVERSATION_SECTIONS = 6;
const MAX_RECENT_ASSISTANT_MESSAGES = 2;

function truncate(value: string, max = 44): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}...`;
}

export function formatRelativeTime(rawDate?: string | Date | null): string {
  if (!rawDate) return "agora";

  const date = rawDate instanceof Date ? rawDate : new Date(rawDate);
  if (Number.isNaN(date.getTime())) return "agora";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `ha ${diffMinutes} min`;
  if (diffHours < 24) return `ha ${diffHours}h`;
  if (diffDays < 7) return `ha ${diffDays} dias`;

  return date.toLocaleDateString("pt-MZ");
}

export function getPreferredSectionId(project: Project | null, sections: Section[]): string | null {
  return (
    project?.lastEditedSection?.id ||
    sections.find((section) => section.children.length > 0)?.children[0]?.id ||
    sections[0]?.id ||
    null
  );
}

export function buildWorkspaceConversations(
  project: Project,
  sections: Section[],
  chatMessages: AssistantMessage[]
): WorkspaceConversationItem[] {
  const flatSections = flattenSections(sections).slice(0, MAX_CONVERSATION_SECTIONS);
  const assistantMessages = [...chatMessages]
    .filter((message) => message.role === "assistant" && message.content.trim())
    .slice(-MAX_RECENT_ASSISTANT_MESSAGES)
    .reverse();

  const items: WorkspaceConversationItem[] = [
    {
      id: `project-${project.id}`,
      title: truncate(project.title),
      subtitle: project.description?.trim() || "Workspace principal do projecto",
      updatedAt: new Date(project.lastEditedSection?.updatedAt || Date.now()).toISOString(),
      updatedLabel: formatRelativeTime(project.lastEditedSection?.updatedAt || new Date()),
      pinned: true,
      kind: "project",
      sectionId: project.lastEditedSection?.id || undefined,
    },
  ];

  for (const section of flatSections) {
      items.push({
        id: `section-${section.id}`,
        title: truncate(section.title),
        subtitle: section.content.trim() ? `${section.wordCount} palavras` : "Secao ainda sem conteudo",
        updatedAt: new Date(section.updatedAt).toISOString(),
        updatedLabel: formatRelativeTime(section.updatedAt),
        kind: "section",
        sectionId: section.id,
    });
  }

  for (const message of assistantMessages) {
      items.push({
        id: `assistant-${message.id}`,
        title: truncate(message.content.replace(/\s+/g, " ")),
        subtitle: "Resposta recente do assistente",
        updatedAt: message.createdAt.toISOString(),
        updatedLabel: formatRelativeTime(message.createdAt),
        kind: "assistant",
      });
  }

  return items;
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
        ? `${activeSection.wordCount.toLocaleString("pt-MZ")} palavras na secao activa`
        : "Secao activa pronta para receber conteudo",
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
    subtitle: "Resumo inicial do projecto",
    content:
      project.description?.trim() ||
      "Este workspace ainda não tem documento em desenvolvimento. Comece pelo assistente ou seleccione uma secção para visualizar aqui.",
    empty: !(project.description?.trim()),
    source: "project",
  };
}

export function buildCodeLines(content: string): string[] {
  const normalized = content.replace(/\r\n/g, "\n");
  return normalized.split("\n");
}

export function rehydrateConversationLabels(
  conversations: PersistedWorkspaceConversation[]
): WorkspaceConversationItem[] {
  return conversations.map((conversation) => ({
    ...conversation,
    title: conversation.customTitle || conversation.title,
    updatedLabel: formatRelativeTime(conversation.updatedAt),
  }));
}
