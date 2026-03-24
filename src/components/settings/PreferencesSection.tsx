"use client";

import * as React from "react";
import { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import {
  Loader2,
  Globe,
  Palette,
  Type,
  Save,
  FileText,
  FileDown,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";

const languages = [
  { value: "pt-MZ", label: "Português (Moçambique)", flag: "🇲🇿" },
  { value: "pt-BR", label: "Português (Brasil)", flag: "🇧🇷" },
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "es", label: "Español", flag: "🇪🇸" },
];

const themes = [
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "light", label: "Claro", icon: Sun },
  { value: "system", label: "Sistema", icon: Monitor },
];

const citationStyles = [
  { value: "ABNT", label: "ABNT" },
  { value: "APA", label: "APA" },
  { value: "VANCOUVER", label: "Vancouver" },
  { value: "CHICAGO", label: "Chicago" },
  { value: "MLA", label: "MLA" },
  { value: "HARVARD", label: "Harvard" },
];

const exportFormats = [
  { value: "pdf", label: "PDF" },
  { value: "docx", label: "Word (.docx)" },
  { value: "md", label: "Markdown (.md)" },
  { value: "txt", label: "Texto (.txt)" },
  { value: "html", label: "HTML" },
];

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
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [exportFormat, setExportFormat] = useState("docx");
  const [preferences, setPreferences] = useState<SettingsData>({
    language: "pt-MZ",
    citationStyle: "ABNT",
    fontSize: 14,
    autoSave: true,
    aiSuggestionsEnabled: true,
    emailNotifications: true,
    marketingEmails: false,
  });

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setPreferences({
          language: data.language || "pt-MZ",
          citationStyle: data.citationStyle || "ABNT",
          fontSize: data.fontSize || 14,
          autoSave: data.autoSave ?? true,
          aiSuggestionsEnabled: data.aiSuggestionsEnabled ?? true,
          emailNotifications: data.emailNotifications ?? true,
          marketingEmails: data.marketingEmails ?? false,
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setIsFetching(false);
    }
  };

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
    setIsLoading(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar");
      }

      toast({
        title: "Preferências salvas",
        description: "As suas preferências foram actualizadas com sucesso",
      });
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as preferências",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Language */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-muted-foreground" />
            Idioma
          </Label>
          <p className="text-sm text-muted-foreground">
            Escolha o idioma da interface
          </p>
        </div>
        <Select
          value={preferences.language}
          onValueChange={(value) => handleSelectChange("language", value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {languages.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                <span className="flex items-center gap-2">
                  <span>{lang.flag}</span>
                  {lang.label}
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
            Tema
          </Label>
          <p className="text-sm text-muted-foreground">
            Escolha entre o modo claro, escuro ou siga as configurações do sistema
          </p>
        </div>
        <div className="flex gap-3">
          {themes.map((t) => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                theme === t.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/30 hover:bg-accent/50"
              }`}
            >
              <t.icon className="h-5 w-5" />
              <span className="text-sm font-medium">{t.label}</span>
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
            Tamanho da Fonte
          </Label>
          <p className="text-sm text-muted-foreground">
            Ajuste o tamanho da fonte do editor
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
            Salvamento Automático
          </Label>
          <p className="text-sm text-muted-foreground">
            Salvar automaticamente suas alterações a cada 30 segundos
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
            Sugestões de IA
          </Label>
          <p className="text-sm text-muted-foreground">
            Mostrar sugestões de IA enquanto escreve
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
            Estilo de Citação Padrão
          </Label>
          <p className="text-sm text-muted-foreground">
            Estilo de citação utilizado por padrão em seus trabalhos
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
                {style.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Export Format */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base">
            <FileDown className="h-4 w-4 text-muted-foreground" />
            Formato de Exportação Padrão
          </Label>
          <p className="text-sm text-muted-foreground">
            Formato padrão ao exportar seus trabalhos
          </p>
        </div>
        <Select
          value={exportFormat}
          onValueChange={setExportFormat}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {exportFormats.map((format) => (
              <SelectItem key={format.value} value={format.value}>
                {format.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Salvando...
            </>
          ) : (
            "Salvar preferências"
          )}
        </Button>
      </div>
    </div>
  );
}
