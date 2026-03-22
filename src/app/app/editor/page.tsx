import { EditorLayout } from "@/components/editor/EditorLayout";

interface EditorPageProps {
  searchParams?: Promise<{
    project?: string;
  }>;
}

export default async function EditorPage({ searchParams }: EditorPageProps) {
  const resolvedSearchParams = await searchParams;

  return <EditorLayout projectId={resolvedSearchParams?.project} />;
}
