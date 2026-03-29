export type WorkspaceDocumentTab = "document";

export interface WorkspaceArtifactSource {
  title: string;
  subtitle: string;
  content: string;
  empty: boolean;
  source: "section" | "assistant" | "project";
}
