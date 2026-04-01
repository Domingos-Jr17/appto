"use client";

import * as React from "react";
import { fetchAppProjects, fetchCreditsBalance, sortProjectsByUpdatedAt, type AppProjectRecord } from "@/lib/app-data";

interface AppShellDataContextValue {
  projects: AppProjectRecord[];
  credits: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
}

const AppShellDataContext = React.createContext<AppShellDataContextValue | null>(null);

export function AppShellDataProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = React.useState<AppProjectRecord[]>([]);
  const [credits, setCredits] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const refreshRef = React.useRef<(() => Promise<void>) | null>(null);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);

    const [projectsResult, creditsResult] = await Promise.allSettled([
      fetchAppProjects(),
      fetchCreditsBalance(),
    ]);

    if (projectsResult.status === "fulfilled") {
      setProjects(sortProjectsByUpdatedAt(projectsResult.value));
    }

    if (creditsResult.status === "fulfilled") {
      setCredits(creditsResult.value);
    }

    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      refreshRef.current?.();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const value = React.useMemo(
    () => ({
      projects,
      credits,
      isLoading,
      refresh,
      setCredits,
    }),
    [credits, isLoading, projects, refresh]
  );

  return <AppShellDataContext.Provider value={value}>{children}</AppShellDataContext.Provider>;
}

export function useAppShellData() {
  const context = React.useContext(AppShellDataContext);

  if (!context) {
    throw new Error("useAppShellData must be used within AppShellDataProvider");
  }

  return context;
}
