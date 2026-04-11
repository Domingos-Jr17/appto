"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
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
import {
  Loader2,
  Lock,
  Shield,
  Monitor,
  Eye,
  EyeOff,
  LogOut,
  Clock,
  MapPin,
  AlertTriangle,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

interface UserSession {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastActiveAt: string;
  createdAt: string;
  current: boolean;
}

export function SecuritySection() {
  const t = useTranslations("settings.securitySection");
  const commonT = useTranslations("common");
  const locale = useLocale();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);
  const [is2faLoading, setIs2faLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [setupPayload, setSetupPayload] = useState<{
    qrCodeDataUrl: string;
    otpauthUrl: string;
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchSecurityState = React.useCallback(async () => {
    try {
      setIsSessionsLoading(true);

      const [userResponse, sessionsResponse] = await Promise.all([
        fetch("/api/user"),
        fetch("/api/user/sessions"),
      ]);

      const userData = await userResponse.json();
      const sessionsData = await sessionsResponse.json();

      if (!userResponse.ok) {
        throw new Error(userData.error || t("errorLoadAccount"));
      }

      if (!sessionsResponse.ok) {
        throw new Error(sessionsData.error || t("errorLoadSessions"));
      }

      setTwoFactorEnabled(Boolean(userData.twoFactorEnabled));
      setSessions(sessionsData.sessions || []);
    } catch (error) {
      toast({
        title: commonT("error"),
        description:
          error instanceof Error
            ? error.message
            : t("errorLoadSecurity"),
        variant: "destructive",
      });
    } finally {
      setIsSessionsLoading(false);
    }
  }, [commonT, t, toast]);

  useEffect(() => {
    void fetchSecurityState();
  }, [fetchSecurityState]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!passwordForm.currentPassword) {
      newErrors.currentPassword = t("changePassword.currentPassword.errorRequired");
    }
    if (!passwordForm.newPassword) {
      newErrors.newPassword = t("changePassword.newPassword.errorRequired");
    } else if (passwordForm.newPassword.length < 8) {
      newErrors.newPassword = t("changePassword.newPassword.errorMinLength");
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      newErrors.confirmPassword = t("changePassword.confirmPassword.errorMismatch");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordChange = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("changePassword.errorChange"));
      }

      toast({
        title: t("changePassword.toast.success.title"),
        description: t("changePassword.toast.success.description"),
      });

      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setErrors({});
    } catch (error) {
      toast({
        title: t("changePassword.toast.error.title"),
        description:
          error instanceof Error
            ? error.message
            : t("changePassword.toast.error.description"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/user/sessions/${sessionId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("sessions.errorRevoke"));
      }

      setSessions((current) => current.filter((session) => session.id !== sessionId));
      toast({
        title: t("sessions.toast.success.title"),
        description: t("sessions.toast.success.description"),
      });
    } catch (error) {
      toast({
        title: t("sessions.toast.error.title"),
        description:
          error instanceof Error
            ? error.message
            : t("sessions.toast.error.description"),
        variant: "destructive",
      });
    }
  };

  const handleSetupTwoFactor = async () => {
    try {
      setIs2faLoading(true);
      const response = await fetch("/api/user/2fa/setup", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("twoFactor.errorSetup"));
      }

      setSetupPayload(data);
      setRecoveryCodes([]);
    } catch (error) {
      toast({
        title: t("changePassword.toast.error.title"),
        description:
          error instanceof Error
            ? error.message
            : t("twoFactor.errorSetup"),
        variant: "destructive",
      });
    } finally {
      setIs2faLoading(false);
    }
  };

  const handleVerifyTwoFactor = async () => {
    try {
      setIs2faLoading(true);
      const response = await fetch("/api/user/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verificationCode }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("twoFactor.errorVerify"));
      }

      setTwoFactorEnabled(true);
      setRecoveryCodes(data.recoveryCodes || []);
      setVerificationCode("");
      toast({
        title: t("twoFactor.toast.enabled.title"),
        description: t("twoFactor.toast.enabled.description"),
      });
    } catch (error) {
      toast({
        title: t("changePassword.toast.error.title"),
        description:
          error instanceof Error
            ? error.message
            : t("twoFactor.errorVerify"),
        variant: "destructive",
      });
    } finally {
      setIs2faLoading(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    try {
      setIs2faLoading(true);
      const response = await fetch("/api/user/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: disablePassword || undefined,
          otpCode: disableCode || undefined,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("twoFactor.errorDisable"));
      }

      setTwoFactorEnabled(false);
      setSetupPayload(null);
      setRecoveryCodes([]);
      setDisablePassword("");
      setDisableCode("");
      toast({
        title: t("twoFactor.toast.disabled.title"),
        description: t("twoFactor.toast.disabled.description"),
      });
    } catch (error) {
      toast({
        title: t("changePassword.toast.error.title"),
        description:
          error instanceof Error
            ? error.message
            : t("twoFactor.errorDisable"),
        variant: "destructive",
      });
    } finally {
      setIs2faLoading(false);
    }
  };

  const formatSessionLabel = (session: UserSession) => {
    if (session.userAgent) {
      return session.userAgent;
    }

    return t("sessions.noUserAgent");
  };

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-muted-foreground" />
            {t("changePassword.title")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t("changePassword.description")}
          </p>
        </div>

        <div className="max-w-md space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">{t("changePassword.currentPassword.label")}</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrentPassword ? "text" : "password"}
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    currentPassword: e.target.value,
                  }))
                }
                placeholder={t("changePassword.currentPassword.placeholder")}
                className={errors.currentPassword ? "border-destructive" : ""}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.currentPassword ? (
              <p className="text-xs text-destructive">{errors.currentPassword}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">{t("changePassword.newPassword.label")}</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))
                }
                placeholder={t("changePassword.newPassword.placeholder")}
                className={errors.newPassword ? "border-destructive" : ""}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.newPassword ? (
              <p className="text-xs text-destructive">{errors.newPassword}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t("changePassword.confirmPassword.label")}</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                placeholder={t("changePassword.confirmPassword.placeholder")}
                className={errors.confirmPassword ? "border-destructive" : ""}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword ? (
              <p className="text-xs text-destructive">{errors.confirmPassword}</p>
            ) : null}
          </div>

          <Button onClick={handlePasswordChange} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("changePassword.changing")}
              </>
            ) : (
              t("changePassword.submitButton")
            )}
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-muted-foreground" />
            {t("twoFactor.title")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t("twoFactor.description")}
          </p>
        </div>

        {!twoFactorEnabled ? (
          <div className="space-y-4 rounded-xl border border-border/60 bg-accent/40 p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
              <div className="space-y-1">
                 <p className="font-medium">{t("twoFactor.notActive")}</p>
                 <p className="text-sm text-muted-foreground">
                   {t("twoFactor.setupDesc")}
                 </p>
              </div>
            </div>

            <Button onClick={handleSetupTwoFactor} disabled={is2faLoading}>
              {is2faLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("twoFactor.preparing")}
                </>
              ) : (
                t("twoFactor.setupButton")
              )}
            </Button>

            {setupPayload ? (
              <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
                <div className="rounded-xl border border-border/60 bg-background p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={setupPayload.qrCodeDataUrl}
                    alt={t("twoFactor.qrCodeAlt")}
                    className="h-full w-full rounded-md"
                  />
                </div>
                <div className="space-y-3">
                  <div>
                      <Label htmlFor="verification-code">{t("twoFactor.codeLabel")}</Label>
                    <Input
                      id="verification-code"
                      inputMode="numeric"
                      value={verificationCode}
                      onChange={(e) =>
                        setVerificationCode(
                          e.target.value.replace(/\D/g, "").slice(0, 6)
                        )
                      }
                       placeholder={t("twoFactor.codePlaceholder")}
                       className="mt-2"
                    />
                  </div>
                     <Button
                    onClick={handleVerifyTwoFactor}
                    disabled={is2faLoading || verificationCode.length < 6}
                  >
                      {t("twoFactor.verifyButton")}
                    </Button>
                   <p className="text-xs text-muted-foreground">
                     {t("twoFactor.manualUriHelp")}{" "}
                     <span className="break-all">{setupPayload.otpauthUrl}</span>
                   </p>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4 rounded-xl border border-border/60 bg-accent/40 p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 h-5 w-5 text-primary" />
              <div className="space-y-1">
                 <p className="font-medium">{t("twoFactor.active")}</p>
                 <p className="text-sm text-muted-foreground">
                   {t("twoFactor.activeDesc")}
                 </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="disable-password">{t("twoFactor.currentPasswordLabel")}</Label>
                <Input
                  id="disable-password"
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder={t("twoFactor.currentPasswordOptional")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="disable-code">{t("twoFactor.code2FA")}</Label>
                <Input
                  id="disable-code"
                  inputMode="numeric"
                  value={disableCode}
                  onChange={(e) =>
                    setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder={t("twoFactor.code2FAOptional")}
                />
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleDisableTwoFactor}
              disabled={is2faLoading || (!disablePassword && !disableCode)}
            >
              {is2faLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("twoFactor.disabling")}
                </>
              ) : (
                t("twoFactor.disableButton")
              )}
            </Button>
          </div>
        )}

        {recoveryCodes.length > 0 ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="mb-3 text-sm font-medium">{t("twoFactor.recoveryCodes")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {recoveryCodes.map((code) => (
                <div
                  key={code}
                  className="rounded-md border border-border/60 bg-background px-3 py-2 font-mono text-sm"
                >
                  {code}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            {t("sessions.title")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t("sessions.description")}
          </p>
        </div>

        {isSessionsLoading ? (
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/50 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("sessions.loading")}
          </div>
        ) : (
          <div className="max-w-xl space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/50 p-4 backdrop-blur-xl transition-all hover:bg-card/60"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Monitor className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatSessionLabel(session)}</span>
                      {session.current ? (
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
                          {t("sessions.current")}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {session.ipAddress || t("sessions.ipNA")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(session.lastActiveAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("sessions.createdAt", { date: formatDateTime(session.createdAt) })}
                    </p>
                  </div>
                </div>

                {!session.current ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <LogOut className="mr-1 h-4 w-4" />
                        {t("sessions.revoke")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                         <AlertDialogTitle>{t("sessions.revokeConfirm")}</AlertDialogTitle>
                         <AlertDialogDescription>
                           {t("sessions.revokeDesc")}
                         </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                         <AlertDialogCancel>{t("sessions.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRevokeSession(session.id)}
                          className="bg-destructive text-white hover:bg-destructive/90"
                        >
                           {t("sessions.revokeButton")}
                         </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      <div className="rounded-xl border border-border/60 bg-accent/50 p-4 shadow-lg">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="text-sm">
            <p className="mb-1 font-medium text-foreground">{t("securityTips.title")}</p>
            <ul className="space-y-1 text-muted-foreground">
              {(t.raw("securityTips.tips") as string[]).map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
