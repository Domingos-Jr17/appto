"use client";

import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { SettingsSectionSkeleton } from "@/components/skeletons/SettingsSectionSkeleton";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { useAccountData } from "@/hooks/use-account-data";
import { useLocaleSwitcher } from "@/hooks/use-locale";
import { useTranslations } from "next-intl";
import {
  Loader2,
  Globe,
  Palette,
  Type,
  Save,
  FileText,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";

const languages = [
  { value: "pt-MZ", key: "ptMZ", flag: "🇲🇿" },
  { value: "pt-BR", key: "ptBR", flag: "🇧🇷" },
  { value: "en", key: "en", flag: "🇺🇸" },
  { value: "es", key: "es", flag: "🇪🇸" },
] as const;

const themes = [
  { value: "dark", key: "dark", icon: Moon },
  { value: "light", key: "light", icon: Sun },
  { value: "system", key: "system", icon: Monitor },
] as const;

const citationStyles = [
  { value: "ABNT", key: "abnt" },
  { value: "APA", key: "apa" },
  { value: "VANCOUVER", key: "vancouver" },
] as const;

interface SettingsData {
  language: string;
  citationStyle: string;
  fontSize: number;
  autoSave: boolean;
  aiSuggestionsEnabled: boolean;
  emailNotifications: boolean;
  marketingEmails: boolean;
}

export function PreferencesSection() {
  const t = useTranslations("settings.preferencesSection");
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { settings, isLoading: isAccountLoading } = useAccountData();
  const { locale: currentLocale, setLocale } = useLocaleSwitcher();
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<SettingsData>({
    language: "pt-MZ",
    citationStyle: "ABNT",
    fontSize: 14,
    autoSave: true,
    aiSuggestionsEnabled: true,
    emailNotifications: true,
    marketingEmails: false,
  });

  React.useEffect(() => {
    if (settings) {
      setPreferences({
        language: settings.language || "pt-MZ",
        citationStyle: settings.citationStyle || "ABNT",
        fontSize: settings.fontSize || 14,
        autoSave: settings.autoSave ?? true,
        aiSuggestionsEnabled: settings.aiSuggestionsEnabled ?? true,
        emailNotifications: settings.emailNotifications ?? true,
        marketingEmails: settings.marketingEmails ?? false,
      });
    }
  }, [settings]);

  const isFetching = isAccountLoading;

  const handleSelectChange = (field: keyof SettingsData, value: string) => {
    setPreferences((prev) => ({ ...prev, [field]: value }));
  };

  const handleSwitchChange = (field: keyof SettingsData, checked: boolean) => {
    setPreferences((prev) => ({ ...prev, [field]: checked }));
  };

  const handleFontSizeChange = (value: number[]) => {
    setPreferences((prev) => ({ ...prev, fontSize: value[0] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error(t("errorSave"));
      }

      toast({
        title: t("toast.success.title"),
        description: t("toast.success.description"),
      });
    } catch {
      toast({
        title: t("toast.error.title"),
        description: t("toast.error.description"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isFetching) {
    return <SettingsSectionSkeleton variant="preferences" />;
  }

  return (
    <div className="space-y-8">
      {/* Language */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-muted-foreground" />
            {t("language.label")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t("language.description")}
          </p>
        </div>
        <Select
          value={currentLocale}
          onValueChange={(value) => setLocale(value as "pt-MZ" | "pt-BR" | "en")}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {languages.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                <span className="flex items-center gap-2">
                  <span>{lang.flag}</span>
                  {t(`languages.${lang.key}`)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Theme */}
      <div className="space-y-4">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-muted-foreground" />
            {t("theme.label")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t("theme.description")}
          </p>
        </div>
        <div className="flex gap-3">
          {themes.map((themeOption) => (
            <button
              key={themeOption.value}
              onClick={() => setTheme(themeOption.value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                theme === themeOption.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/30 hover:bg-accent/50"
              }`}
            >
              <themeOption.icon className="h-5 w-5" />
              <span className="text-sm font-medium">
                {t(`themes.${themeOption.key}`)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Font Size */}
      <div className="space-y-4">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base">
            <Type className="h-4 w-4 text-muted-foreground" />
            {t("fontSize.label")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t("fontSize.description")}
          </p>
        </div>
        <div className="flex items-center gap-4 max-w-md">
          <span className="text-sm text-muted-foreground">A</span>
          <Slider
            value={[preferences.fontSize]}
            onValueChange={handleFontSizeChange}
            min={12}
            max={24}
            step={1}
            className="flex-1"
          />
          <span className="text-lg text-muted-foreground font-medium">A</span>
          <span className="text-sm font-medium w-12 text-center">
            {preferences.fontSize}px
          </span>
        </div>
      </div>

      <Separator />

      {/* Auto-save */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base">
            <Save className="h-4 w-4 text-muted-foreground" />
            {t("autoSave.label")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t("autoSave.description")}
          </p>
        </div>
        <Switch
          checked={preferences.autoSave}
          onCheckedChange={(checked) => handleSwitchChange("autoSave", checked)}
        />
      </div>

      <Separator />

      {/* AI Suggestions */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-muted-foreground" />
            {t("aiSuggestions.label")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t("aiSuggestions.description")}
          </p>
        </div>
        <Switch
          checked={preferences.aiSuggestionsEnabled}
          onCheckedChange={(checked) => handleSwitchChange("aiSuggestionsEnabled", checked)}
        />
      </div>

      <Separator />

      {/* Citation Style */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-muted-foreground" />
            {t("citationStyle.label")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t("citationStyle.description")}
          </p>
        </div>
        <Select
          value={preferences.citationStyle}
          onValueChange={(value) => handleSelectChange("citationStyle", value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {citationStyles.map((style) => (
              <SelectItem key={style.value} value={style.value}>
                {t(`citationStyles.${style.key}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {t("saving")}
            </>
          ) : (
            t("saveButton")
          )}
        </Button>
      </div>
    </div>
  );
}
