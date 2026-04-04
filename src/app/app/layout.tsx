"use client";

import * as React from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { AppShell } from "@/components/app-shell/AppShell";

interface AppLayoutProps {
  children: React.ReactNode;
}

const PROJECT_STORE_KEY = "appto-project-store";
const EDITOR_STORE_KEY = "appto-editor-store";
const ACTIVE_USER_KEY = "appto-active-user";

function clearPersistedWorkspaceState() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(PROJECT_STORE_KEY);
  window.sessionStorage.removeItem(EDITOR_STORE_KEY);
  window.localStorage.removeItem(ACTIVE_USER_KEY);
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated" || session?.error === "SessionInvalidated") {
      clearPersistedWorkspaceState();
      router.replace("/login");
    }
  }, [router, session?.error, status]);

  useEffect(() => {
    if (typeof window === "undefined" || !session?.user?.id) {
      return;
    }

    const previousUserId = window.localStorage.getItem(ACTIVE_USER_KEY);
    if (previousUserId && previousUserId !== session.user.id) {
      window.sessionStorage.removeItem(PROJECT_STORE_KEY);
      window.sessionStorage.removeItem(EDITOR_STORE_KEY);
    }
    window.localStorage.setItem(ACTIVE_USER_KEY, session.user.id);
  }, [session?.user?.id]);

  if (status === "loading" || !session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <AppShell user={session.user}>{children}</AppShell>;
}
