import { redirect } from "next/navigation";

interface ProjectWorkspacePageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectWorkspacePage({ params }: ProjectWorkspacePageProps) {
  const resolvedParams = await params;

  redirect(`/app/sessoes/${resolvedParams.id}`);
}
