import { EditorLayout } from "@/components/editor/EditorLayout";
import type { WorkspaceMode } from "@/components/workspace/WorkspaceModeTabs";

interface ProjectEditorPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    mode?: string;
  }>;
}

function resolveMode(mode?: string): WorkspaceMode | undefined {
  if (mode === "chat" || mode === "document" || mode === "structure") {
    return mode;
  }
  return undefined;
}

export default async function ProjectEditorPage({ params, searchParams }: ProjectEditorPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <EditorLayout
      projectId={resolvedParams.id}
      initialMode={resolveMode(resolvedSearchParams?.mode)}
    />
  );
}
