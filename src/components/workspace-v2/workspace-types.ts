import type { WorkspaceSidebarConversationItem } from "@/components/workspace/workspaceSidebarTypes";
import type { AssistantMessage, Project, Section } from "@/types/editor";

export type WorkspaceConversationItem = WorkspaceSidebarConversationItem;

export interface WorkspaceProjectLinkItem {
  id: string;
  title: string;
  updatedAt: string;
  wordCount: number;
  resumeMode?: "chat" | "document" | "structure";
  status?: string;
}

export type WorkspaceDocumentTab = "document" | "structure" | "preview";

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
