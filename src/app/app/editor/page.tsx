import { EditorLayout } from "@/components/editor/EditorLayout";
import type { WorkspaceMode } from "@/components/workspace/WorkspaceModeTabs";

interface EditorPageProps {
  searchParams?: Promise<{
    project?: string;
    mode?: string;
  }>;
}

function resolveMode(mode?: string): WorkspaceMode | undefined {
  if (mode === "chat" || mode === "document" || mode === "structure") {
    return mode;
  }
  return undefined;
}

export default async function EditorPage({ searchParams }: EditorPageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <EditorLayout
      projectId={resolvedSearchParams?.project}
      initialMode={resolveMode(resolvedSearchParams?.mode)}
    />
  );
}
