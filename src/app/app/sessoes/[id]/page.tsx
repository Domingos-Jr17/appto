import { redirect } from "next/navigation";

interface SessionWorkspacePageProps {
  params: Promise<{ id: string }>;
}

export default async function SessionWorkspacePage({ params }: SessionWorkspacePageProps) {
  const resolvedParams = await params;

  redirect(`/app/trabalhos/${resolvedParams.id}`);
}
