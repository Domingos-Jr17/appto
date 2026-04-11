"use client";

import { useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { useLocaleSwitcher } from "@/hooks/use-locale";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SupportedLocale = "pt-MZ" | "pt-BR" | "en";

const localeLabels: Record<SupportedLocale, { label: string; flag: string }> = {
  "pt-MZ": { label: "PT", flag: "🇲🇿" },
  "pt-BR": { label: "BR", flag: "🇧🇷" },
  en: { label: "EN", flag: "🇬🇧" },
};

export function LocaleSelector() {
  const { locale, setLocale } = useLocaleSwitcher();
  const t = useTranslations("appShell");
  const currentLocale = locale as SupportedLocale;
  const current = localeLabels[currentLocale] || localeLabels["pt-MZ"];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-2xl border border-white/10 bg-background/20 text-foreground hover:bg-background/35"
          aria-label={t("localeSelector.selectLanguage")}
        >
          <div className="flex items-center gap-1">
            <Globe className="h-4 w-4" />
            <span className="text-xs font-medium">{current.label}</span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {(Object.keys(localeLabels) as SupportedLocale[]).map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => setLocale(loc)}
            className="flex items-center gap-2"
          >
            <span className="text-base">{localeLabels[loc].flag}</span>
            <span className="text-sm">
              {loc === "pt-MZ" && "Português (Moçambique)"}
              {loc === "pt-BR" && "Português (Brasil)"}
              {loc === "en" && "English"}
            </span>
            {loc === currentLocale && (
              <span className="ml-auto text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
