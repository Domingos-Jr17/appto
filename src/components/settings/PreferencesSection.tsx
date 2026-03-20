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
  { value: "abnt", label: "ABNT" },
  { value: "apa", label: "APA" },
  { value: "vancouver", label: "Vancouver" },
  { value: "chicago", label: "Chicago" },
  { value: "mla", label: "MLA" },
  { value: "harvard", label: "Harvard" },
];

const exportFormats = [
  { value: "pdf", label: "PDF" },
  { value: "docx", label: "Word (.docx)" },
  { value: "md", label: "Markdown (.md)" },
  { value: "txt", label: "Texto (.txt)" },
  { value: "html", label: "HTML" },
];

export function PreferencesSection() {
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    language: "pt-BR",
    theme: "dark",
    fontSize: [16],
    autoSave: true,
    citationStyle: "abnt",
    exportFormat: "pdf",
  });

  const handleSelectChange = (field: string, value: string) => {
    setPreferences((prev) => ({ ...prev, [field]: value }));
  };

  const handleSwitchChange = (field: string, checked: boolean) => {
    setPreferences((prev) => ({ ...prev, [field]: checked }));
  };

  const handleFontSizeChange = (value: number[]) => {
    setPreferences((prev) => ({ ...prev, fontSize: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

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
          {themes.map((theme) => (
            <button
              key={theme.value}
              onClick={() => handleSelectChange("theme", theme.value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                preferences.theme === theme.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/30 hover:bg-accent/50"
              }`}
            >
              <theme.icon className="h-5 w-5" />
              <span className="text-sm font-medium">{theme.label}</span>
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
            value={preferences.fontSize}
            onValueChange={handleFontSizeChange}
            min={12}
            max={24}
            step={1}
            className="flex-1"
          />
          <span className="text-lg text-muted-foreground font-medium">A</span>
          <span className="text-sm font-medium w-12 text-center">
            {preferences.fontSize[0]}px
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
          value={preferences.exportFormat}
          onValueChange={(value) => handleSelectChange("exportFormat", value)}
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
