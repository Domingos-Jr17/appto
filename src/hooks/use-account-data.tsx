"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { shouldPauseNonCriticalAppFetch } from "@/lib/app-shell-fetch-policy";

interface AccountData {
  id: string;
  name: string;
  email: string;
  role: string;
  credits: number;
  twoFactorEnabled: boolean;
  subscription: {
    package: string;
    status: string;
  } | null;
  createdAt: string;
}

interface SettingsData {
  language: string;
  citationStyle: string;
  fontSize: number;
  autoSave: boolean;
  aiSuggestionsEnabled: boolean;
  emailNotifications: boolean;
  marketingEmails: boolean;
}

interface AccountState {
  user: AccountData | null;
  settings: SettingsData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const AccountDataContext = React.createContext<AccountState | null>(null);

export function AccountDataProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = React.useState<AccountData | null>(null);
  const [settings, setSettings] = React.useState<SettingsData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const pauseAutoFetch = shouldPauseNonCriticalAppFetch(pathname);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [userRes, settingsRes] = await Promise.all([
        fetch("/api/user"),
        fetch("/api/settings"),
      ]);

      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData);
      } else {
        setError("Não foi possível carregar os dados da conta.");
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
      }
    } catch {
      setError("Erro ao carregar dados da conta.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (pauseAutoFetch) {
      setIsLoading(false);
      return;
    }

    void refresh();
  }, [pauseAutoFetch, refresh]);

  const value = React.useMemo(
    () => ({ user, settings, isLoading, error, refresh }),
    [user, settings, isLoading, error, refresh]
  );

  return <AccountDataContext.Provider value={value}>{children}</AccountDataContext.Provider>;
}

export function useAccountData() {
  const context = React.useContext(AccountDataContext);

  if (!context) {
    throw new Error("useAccountData must be used within AccountDataProvider");
  }

  return context;
}
