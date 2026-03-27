"use client";

import * as React from "react";
import { fetchAppProjects, fetchCreditsBalance, sortProjectsByUpdatedAt, type AppProjectRecord } from "@/lib/app-data";

interface AppWorkspaceDataContextValue {
  projects: AppProjectRecord[];
  credits: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
}

const AppWorkspaceDataContext = React.createContext<AppWorkspaceDataContextValue | null>(null);

export function AppWorkspaceDataProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = React.useState<AppProjectRecord[]>([]);
  const [credits, setCredits] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);

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
    void refresh();
  }, [refresh]);

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

  return <AppWorkspaceDataContext.Provider value={value}>{children}</AppWorkspaceDataContext.Provider>;
}

export function useAppWorkspaceData() {
  const context = React.useContext(AppWorkspaceDataContext);

  if (!context) {
    throw new Error("useAppWorkspaceData must be used within AppWorkspaceDataProvider");
  }

  return context;
}
