import { redirect } from "next/navigation";

interface LegacySessoesPageProps {
  params: Promise<{ id: string }>;
}

export default async function LegacySessoesPage({ params }: LegacySessoesPageProps) {
  const resolvedParams = await params;

  redirect(`/app/trabalhos/${resolvedParams.id}`);
}
