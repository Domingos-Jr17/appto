"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { SettingsSectionSkeleton } from "@/components/skeletons/SettingsSectionSkeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Mail,
  Gift,
  AlertCircle,
} from "lucide-react";

interface SettingsData {
  emailNotifications: boolean;
  marketingEmails: boolean;
}

export function NotificationsSection() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [preferences, setPreferences] = useState<SettingsData>({
    emailNotifications: true,
    marketingEmails: false,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setPreferences({
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

  const handleToggle = (field: keyof SettingsData, checked: boolean) => {
    setPreferences((prev) => ({ ...prev, [field]: checked }));
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
        throw new Error("Erro ao guardar");
      }

      toast({
        title: "Preferências guardadas",
        description: "As suas preferências de notificação foram actualizadas",
      });
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível guardar as preferências",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return <SettingsSectionSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Email Notifications */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Notificações por Email
          </Label>
          <p className="text-sm text-muted-foreground">
            Receber notificações importantes por email
          </p>
        </div>
        <Switch
          checked={preferences.emailNotifications}
          onCheckedChange={(checked) => handleToggle("emailNotifications", checked)}
        />
      </div>

      <Separator />

      {/* Marketing Emails */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base">
            <Gift className="h-4 w-4 text-muted-foreground" />
            Novidades e Dicas
          </Label>
          <p className="text-sm text-muted-foreground">
            Receba tutoriais e novidades sobre a plataforma
          </p>
        </div>
        <Switch
          checked={preferences.marketingEmails}
          onCheckedChange={(checked) => handleToggle("marketingEmails", checked)}
        />
      </div>

      <Separator />

      {/* Info Box */}
      <div className="rounded-xl border border-border/50 bg-accent/50 p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground mb-1">
              Notificações de segurança
            </p>
            <p className="text-muted-foreground">
              Notificações importantes sobre segurança da conta serão sempre enviadas por email, independentemente destas configurações.
            </p>
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              A guardar...
            </>
          ) : (
            "Guardar preferências"
          )}
        </Button>
      </div>
    </div>
  );
}
