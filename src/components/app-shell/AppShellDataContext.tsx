"use client";

import * as React from "react";
import { fetchAppProjects, sortProjectsByUpdatedAt, type AppProjectRecord } from "@/lib/app-data";

interface AppShellDataContextValue {
  projects: AppProjectRecord[];
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const AppShellDataContext = React.createContext<AppShellDataContextValue | null>(null);

const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
const BACKGROUND_REFRESH_INTERVAL = 60 * 1000; // 1 minute

export function AppShellDataProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = React.useState<AppProjectRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [lastFetchTime, setLastFetchTime] = React.useState<number>(0);
  const refreshRef = React.useRef<((silent: boolean) => Promise<void>) | null>(null);

  const refresh = React.useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    }

    const [projectsResult] = await Promise.allSettled([fetchAppProjects()]);

    if (projectsResult.status === "fulfilled") {
      setProjects(sortProjectsByUpdatedAt(projectsResult.value));
    }

    setLastFetchTime(Date.now());
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  React.useEffect(() => {
     const timer = setTimeout(() => {
       refreshRef.current?.(true);
     }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Background refresh when stale
  const lastFetchTimeRef = React.useRef(lastFetchTime);
  const isLoadingRef = React.useRef(isLoading);

  React.useEffect(() => {
    lastFetchTimeRef.current = lastFetchTime;
  }, [lastFetchTime]);

  React.useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      const isStale = Date.now() - lastFetchTimeRef.current > STALE_THRESHOLD;
      if (isStale && !isLoadingRef.current) {
        refreshRef.current?.(true); // silent refresh
      }
    }, BACKGROUND_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [refresh]);

  const value = React.useMemo(
    () => ({
      projects,
      isLoading,
      refresh,
    }),
    [isLoading, projects, refresh]
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
