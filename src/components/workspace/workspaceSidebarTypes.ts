export interface WorkspaceSidebarConversationItem {
  id: string;
  title: string;
  subtitle: string;
  updatedLabel: string;
  updatedAt: string;
  pinned?: boolean;
  kind: "project" | "section" | "assistant";
  sectionId?: string;
}
