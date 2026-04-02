"use client";

import { useSession } from "next-auth/react";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { InlineWorkCreator } from "@/components/work-creation/InlineWorkCreator";

export default function WorkspaceHomePage() {
  const { status } = useSession();

  if (status === "loading") {
    return <DashboardSkeleton />;
  }

  return <InlineWorkCreator />;
}
