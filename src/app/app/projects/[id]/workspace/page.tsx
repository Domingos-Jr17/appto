import { ProjectWorkspaceRoute } from "@/components/workspace-v2/ProjectWorkspaceRoute";

interface ProjectWorkspacePageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectWorkspacePage({ params }: ProjectWorkspacePageProps) {
  const resolvedParams = await params;

  return <ProjectWorkspaceRoute projectId={resolvedParams.id} />;
}
