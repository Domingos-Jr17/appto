import { SessionWorkspaceRoute } from "@/components/session-workspace/SessionWorkspaceRoute";

interface SessionWorkspacePageProps {
  params: Promise<{ id: string }>;
}

export default async function SessionWorkspacePage({ params }: SessionWorkspacePageProps) {
  const resolvedParams = await params;

  return <SessionWorkspaceRoute key={resolvedParams.id} projectId={resolvedParams.id} />;
}
