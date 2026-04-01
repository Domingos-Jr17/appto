import { notFound } from "next/navigation";
import { getWork } from "@/lib/works";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

interface WorkspacePageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { id } = await params;
  const work = await getWork(id);

  if (!work) notFound();

  return <WorkspaceLayout initialData={work} />;
}
