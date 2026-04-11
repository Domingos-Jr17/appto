"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SettingsSectionSkeleton } from "@/components/skeletons/SettingsSectionSkeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAccountData } from "@/hooks/use-account-data";
import { useLocale, useTranslations } from "next-intl";
import {
  Loader2,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Calendar,
  HardDrive,
  Shield,
  Package,
} from "lucide-react";

export function AccountSection() {
  const t = useTranslations("settings.accountSection");
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const { user: accountUser, isLoading: isAccountLoading } = useAccountData();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteOtpCode, setDeleteOtpCode] = useState("");

  const user = accountUser;
  const isLoading = isAccountLoading;

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/user/export");

      if (!response.ok) {
        throw new Error(t("export.errorExport"));
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `appto-data-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: t("export.toast.success.title"),
        description: t("export.toast.success.description"),
      });
    } catch {
      toast({
        title: t("export.toast.error.title"),
        description: t("export.toast.error.description"),
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch("/api/user/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmation: deleteConfirmation,
          currentPassword: deletePassword || undefined,
          otpCode: deleteOtpCode || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("dangerZone.deleteAccount.errorDelete"));
      }

      toast({
        title: t("dangerZone.deleteAccount.toast.success.title"),
        description: t("dangerZone.deleteAccount.toast.success.description"),
      });

      await signOut({ redirect: false });
      router.push("/");
    } catch (error) {
      toast({
        title: t("dangerZone.deleteAccount.toast.error.title"),
        description:
          error instanceof Error
            ? error.message
            : t("dangerZone.deleteAccount.toast.error.description"),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmation("");
      setDeletePassword("");
      setDeleteOtpCode("");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getPackageLabel = (pkg: string) => {
    const labels: Record<string, string> = {
      FREE: t("packageCard.values.free"),
      STARTER: t("packageCard.values.starter"),
      PRO: t("packageCard.values.pro"),
    };
    return labels[pkg] || pkg;
  };

  if (isLoading) {
    return <SettingsSectionSkeleton variant="account" />;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-muted-foreground" />
            {t("status.title")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t("status.description")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card/50 p-4 ">
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-lg bg-success/10 p-2">
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
              <div>
                 <p className="text-sm text-muted-foreground">{t("statusCard.label")}</p>
                 <p className="font-semibold text-success">{t("statusCard.value")}</p>
               </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/50 p-4 ">
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div>
                 <p className="text-sm text-muted-foreground">{t("packageCard.label")}</p>
                 <p className="font-semibold">
                   {user?.subscription ? getPackageLabel(user.subscription.package) : t("packageCard.valueFree")}
                 </p>
               </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/50 p-4 ">
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                 <p className="text-sm text-muted-foreground">{t("memberSince")}</p>
                <p className="font-semibold">
                  {user?.createdAt ? formatDate(user.createdAt) : "-"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/50 p-4 ">
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <HardDrive className="h-4 w-4 text-primary" />
              </div>
              <div>
                 <p className="text-sm text-muted-foreground">{t("billingCard.label")}</p>
                 <p className="font-semibold">
                   {t("billingCard.value")}
                 </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base">
            <Download className="h-4 w-4 text-muted-foreground" />
            {t("export.title")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t("export.description")}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-accent/50 p-4 ">
          <p className="mb-4 text-sm text-muted-foreground">
            {t("export.details")}
          </p>
          <Button variant="outline" onClick={handleExportData} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("export.exporting")}
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                {t("export.button")}
              </>
            )}
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base text-destructive">
            <Trash2 className="h-4 w-4" />
            {t("dangerZone.title")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t("dangerZone.description")}
          </p>
        </div>

        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 ">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
               <h4 className="mb-1 font-semibold text-destructive">{t("dangerZone.deleteAccount.heading")}</h4>
               <p className="text-sm text-muted-foreground">
                 {t("dangerZone.deleteAccount.description")}
               </p>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="shrink-0">
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("dangerZone.deleteAccount.button")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    {t("dangerZone.deleteAccount.dialogTitle")}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-left">
                    {t("dangerZone.deleteAccount.dialogDesc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="py-4">
                  <p className="mb-2 text-sm text-muted-foreground">
                    {t("dangerZone.deleteAccount.confirmPromptBefore")} <span className="font-bold text-foreground">{t("dangerZone.deleteAccount.confirmText")}</span> {t("dangerZone.deleteAccount.confirmPromptAfter")}
                  </p>
                  <Input
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder={t("dangerZone.deleteAccount.confirmText")}
                  />

                  <div className="mt-4 grid gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="delete-password">
                        {t("dangerZone.deleteAccount.currentPassword")}
                        <span className="ml-1 text-xs text-muted-foreground">
                          {user?.twoFactorEnabled
                            ? t("dangerZone.deleteAccount.passwordOptional")
                            : t("dangerZone.deleteAccount.passwordRequired")}
                        </span>
                      </Label>
                      <Input
                        id="delete-password"
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder={t("dangerZone.deleteAccount.passwordPlaceholder")}
                      />
                    </div>

                    {user?.twoFactorEnabled ? (
                      <div className="space-y-2">
                        <Label htmlFor="delete-otp">{t("dangerZone.deleteAccount.code2FA")}</Label>
                        <Input
                          id="delete-otp"
                          inputMode="numeric"
                          value={deleteOtpCode}
                          onChange={(e) =>
                            setDeleteOtpCode(
                              e.target.value.replace(/\D/g, "").slice(0, 6)
                            )
                          }
                          placeholder={t("dangerZone.deleteAccount.codePlaceholder")}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel
                    onClick={() => {
                      setDeleteConfirmation("");
                      setDeletePassword("");
                      setDeleteOtpCode("");
                    }}
                  >
                    {t("dangerZone.deleteAccount.cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={
                       deleteConfirmation !== t("dangerZone.deleteAccount.confirmText") ||
                       isDeleting ||
                       (!deletePassword && !(user?.twoFactorEnabled && deleteOtpCode))
                     }
                    className="bg-destructive text-white hover:bg-destructive/90 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("dangerZone.deleteAccount.deleting")}
                      </>
                    ) : (
                      t("dangerZone.deleteAccount.deleteButton")
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <Separator />

      <div className="rounded-xl border border-border/60 bg-accent/50 p-4 shadow-lg">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="text-sm">
            <p className="mb-1 font-medium text-foreground">{t("help.title")}</p>
            <p className="text-muted-foreground">
              {t("help.descriptionBeforeLink")}{" "}
              <a href="mailto:suporte@appto.mz" className="text-primary hover:underline">
                {t("help.support")}
              </a>{" "}
              {t("help.descriptionAfterLink")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
