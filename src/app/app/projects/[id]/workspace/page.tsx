import { redirect } from "next/navigation";

interface ProjectWorkspaceRedirectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectWorkspaceRedirectPage({ params }: ProjectWorkspaceRedirectPageProps) {
  const { id } = await params;
  redirect(`/app/projects/${id}`);
}
