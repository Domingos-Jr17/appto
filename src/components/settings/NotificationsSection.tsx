"use client";

import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { SettingsSectionSkeleton } from "@/components/skeletons/SettingsSectionSkeleton";
import { useToast } from "@/hooks/use-toast";
import { useAccountData } from "@/hooks/use-account-data";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("settings.notifications");
  const { toast } = useToast();
  const { settings, isLoading: isAccountLoading } = useAccountData();
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<SettingsData>({
    emailNotifications: true,
    marketingEmails: false,
  });

  React.useEffect(() => {
    if (settings) {
      setPreferences({
        emailNotifications: settings.emailNotifications ?? true,
        marketingEmails: settings.marketingEmails ?? false,
      });
    }
  }, [settings]);

  const isFetching = isAccountLoading;

  const handleToggle = (field: keyof SettingsData, checked: boolean) => {
    setPreferences((prev) => ({ ...prev, [field]: checked }));
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
      {/* Email Notifications */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-muted-foreground" />
            {t("emailNotifications.label")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t("emailNotifications.description")}
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
            {t("marketingEmails.label")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t("marketingEmails.description")}
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
              {t("securityNotice.title")}
            </p>
            <p className="text-muted-foreground">
              {t("securityNotice.description")}
            </p>
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
