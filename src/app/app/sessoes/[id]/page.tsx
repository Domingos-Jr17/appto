import { ProjectWorkspaceRoute } from "@/components/workspace-v2/ProjectWorkspaceRoute";

interface SessionWorkspacePageProps {
  params: Promise<{ id: string }>;
}

export default async function SessionWorkspacePage({ params }: SessionWorkspacePageProps) {
  const resolvedParams = await params;

  return <ProjectWorkspaceRoute projectId={resolvedParams.id} />;
}
