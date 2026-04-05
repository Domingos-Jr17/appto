"use client";

import { useCallback } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";

type SupportedLocale = "pt-MZ" | "pt-BR" | "en";

export function useLocaleSwitcher() {
  const locale = useLocale() as SupportedLocale;

  const setLocale = useCallback(async (newLocale: SupportedLocale) => {
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  }, []);

  return { locale, setLocale };
}
