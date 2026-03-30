import { WorkWorkspaceRoute } from "@/components/work-workspace/WorkWorkspaceRoute";

interface WorkWorkspacePageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkWorkspacePage({ params }: WorkWorkspacePageProps) {
  const resolvedParams = await params;

  return <WorkWorkspaceRoute key={resolvedParams.id} projectId={resolvedParams.id} />;
}
