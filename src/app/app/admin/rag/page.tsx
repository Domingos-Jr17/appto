"use client";

import { useSession } from "next-auth/react";
import { ShieldAlert } from "lucide-react";

import { RagAdminClient } from "@/components/admin/RagAdminClient";
import { EmptyState } from "@/components/ui/empty-state";

export default function RagAdminPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session?.user || session.user.role !== "ADMIN") {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Acesso restrito"
        description="Esta área administrativa está disponível apenas para contas com perfil ADMIN."
      />
    );
  }

  return <RagAdminClient />;
}
