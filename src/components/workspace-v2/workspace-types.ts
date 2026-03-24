import type { AssistantMessage, Project, Section } from "@/types/editor";

export interface WorkspaceConversationItem {
  id: string;
  title: string;
  subtitle: string;
  updatedLabel: string;
  updatedAt: string;
  pinned?: boolean;
  kind: "project" | "section" | "assistant";
  sectionId?: string;
}

export interface PersistedWorkspaceConversation {
  id: string;
  title: string;
  subtitle: string;
  updatedAt: string;
  pinned?: boolean;
  kind: "project" | "section" | "assistant";
  sectionId?: string;
  hidden?: boolean;
  customTitle?: string;
}

export interface WorkspaceArtifactSource {
  title: string;
  subtitle: string;
  content: string;
  empty: boolean;
  source: "section" | "assistant" | "project";
}

export interface WorkspaceSnapshot {
  project: Project;
  sections: Section[];
  chatMessages: AssistantMessage[];
  activeSection: Section | null;
}
