import type { AssistantMessage, Project, Section } from "@/types/editor";
import type {
  PersistedWorkspaceConversation,
  WorkspaceArtifactSource,
  WorkspaceConversationItem,
} from "./types";
import { flattenSections } from "@/lib/editor-helpers";
import { DEFAULT_PROJECT_SECTIONS } from "@/lib/project-templates";

const MAX_CONVERSATION_SECTIONS = 6;
const MAX_RECENT_ASSISTANT_MESSAGES = 2;

function truncate(value: string, max = 44): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}...`;
}

function normalizeTimestamp(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
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
  const fallbackUpdatedAt = [
    normalizeTimestamp(project.lastEditedSection?.updatedAt),
    ...flatSections.map((section) => normalizeTimestamp(section.updatedAt)),
    ...chatMessages.map((message) => normalizeTimestamp(message.createdAt)),
  ].reduce<Date>((latest, current) => {
    if (!current) return latest;
    return current.getTime() > latest.getTime() ? current : latest;
  }, new Date(0));
  const normalizedFallbackUpdatedAt = fallbackUpdatedAt.toISOString();

  const items: WorkspaceConversationItem[] = [
    {
      id: `project-${project.id}`,
      title: truncate(project.title),
      subtitle: project.description?.trim() || "Workspace principal da sessão",
      updatedAt: normalizedFallbackUpdatedAt,
      updatedLabel: formatRelativeTime(fallbackUpdatedAt),
      pinned: true,
      kind: "project",
    },
  ];

  for (const section of flatSections) {
      const sectionUpdatedAt = normalizeTimestamp(section.updatedAt) || new Date(0);
      items.push({
        id: `section-${section.id}`,
        title: truncate(section.title),
        subtitle: section.content.trim() ? `${section.wordCount} palavras` : "Secao ainda sem conteudo",
        updatedAt: sectionUpdatedAt.toISOString(),
        updatedLabel: formatRelativeTime(sectionUpdatedAt),
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
  activeConversation: WorkspaceConversationItem | null,
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

  if (activeConversation?.kind === "assistant") {
    const assistantMessage = chatMessages.find(
      (message) => message.role === "assistant" && `assistant-${message.id}` === activeConversation.id
    );

    if (assistantMessage) {
      return {
        title: "Proposta do assistente",
        subtitle: activeConversation.updatedLabel,
        content: assistantMessage.content,
        empty: false,
        source: "assistant",
      };
    }
  }

  if (activeConversation?.kind === "project") {
    return {
      title: project.title,
      subtitle: "Resumo inicial da sessão",
      content:
        project.description?.trim() ||
        "Esta sessão ainda não tem documento em desenvolvimento. Comece pelo assistente ou seleccione uma secção para visualizar aqui.",
      empty: !(project.description?.trim()),
      source: "project",
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
    subtitle: "Resumo inicial da sessão",
    content:
      project.description?.trim() ||
      "Esta sessão ainda não tem documento em desenvolvimento. Comece pelo assistente ou seleccione uma secção para visualizar aqui.",
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
