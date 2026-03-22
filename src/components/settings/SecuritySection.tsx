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

interface UserSession {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastActiveAt: string;
  createdAt: string;
  current: boolean;
}

export function SecuritySection() {
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
        throw new Error(userData.error || "Não foi possível carregar a conta.");
      }

      if (!sessionsResponse.ok) {
        throw new Error(
          sessionsData.error || "Não foi possível carregar as sessões."
        );
      }

      setTwoFactorEnabled(Boolean(userData.twoFactorEnabled));
      setSessions(sessionsData.sessions || []);
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os dados de segurança.",
        variant: "destructive",
      });
    } finally {
      setIsSessionsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchSecurityState();
  }, [fetchSecurityState]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!passwordForm.currentPassword) {
      newErrors.currentPassword = "Senha actual é obrigatória";
    }
    if (!passwordForm.newPassword) {
      newErrors.newPassword = "Nova senha é obrigatória";
    } else if (passwordForm.newPassword.length < 8) {
      newErrors.newPassword = "A senha deve ter pelo menos 8 caracteres";
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      newErrors.confirmPassword = "As senhas não coincidem";
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
        throw new Error(data.error || "Erro ao alterar senha");
      }

      toast({
        title: "Senha alterada",
        description: "A sua senha foi alterada com sucesso",
      });

      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setErrors({});
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível alterar a senha",
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
        throw new Error(data.error || "Não foi possível revogar a sessão.");
      }

      setSessions((current) => current.filter((session) => session.id !== sessionId));
      toast({
        title: "Sessão revogada",
        description: "A sessão foi terminada com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível revogar a sessão.",
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
        throw new Error(data.error || "Não foi possível iniciar a configuração.");
      }

      setSetupPayload(data);
      setRecoveryCodes([]);
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível iniciar a configuração do 2FA.",
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
        throw new Error(data.error || "Não foi possível validar o código.");
      }

      setTwoFactorEnabled(true);
      setRecoveryCodes(data.recoveryCodes || []);
      setVerificationCode("");
      toast({
        title: "2FA activado",
        description: "Guarde os códigos de recuperação em local seguro.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível activar o 2FA.",
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
        throw new Error(data.error || "Não foi possível desactivar o 2FA.");
      }

      setTwoFactorEnabled(false);
      setSetupPayload(null);
      setRecoveryCodes([]);
      setDisablePassword("");
      setDisableCode("");
      toast({
        title: "2FA desactivado",
        description: "A autenticação de dois fatores foi removida.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível desactivar o 2FA.",
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

    return "Sessão sem user agent disponível";
  };

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString("pt-MZ", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-muted-foreground" />
            Alterar Senha
          </Label>
          <p className="text-sm text-muted-foreground">
            Atualize sua senha para manter sua conta segura.
          </p>
        </div>

        <div className="max-w-md space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Senha atual</Label>
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
                placeholder="Digite sua senha atual"
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
            <Label htmlFor="new-password">Nova senha</Label>
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
                placeholder="Digite a nova senha"
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
            <Label htmlFor="confirm-password">Confirmar nova senha</Label>
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
                placeholder="Confirme a nova senha"
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
                Alterando...
              </>
            ) : (
              "Alterar senha"
            )}
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Autenticação de Dois Fatores
          </Label>
          <p className="text-sm text-muted-foreground">
            Proteja o login com um autenticador TOTP e códigos de recuperação.
          </p>
        </div>

        {!twoFactorEnabled ? (
          <div className="space-y-4 rounded-xl border border-border/50 bg-accent/40 p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
              <div className="space-y-1">
                <p className="font-medium">2FA ainda não está activo</p>
                <p className="text-sm text-muted-foreground">
                  Gere um QR code, associe no autenticador e valide um código de
                  6 dígitos.
                </p>
              </div>
            </div>

            <Button onClick={handleSetupTwoFactor} disabled={is2faLoading}>
              {is2faLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparando...
                </>
              ) : (
                "Iniciar configuração"
              )}
            </Button>

            {setupPayload ? (
              <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
                <div className="rounded-xl border border-border/50 bg-background p-3">
                  <img
                    src={setupPayload.qrCodeDataUrl}
                    alt="QR code para configurar 2FA"
                    className="h-full w-full rounded-md"
                  />
                </div>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="verification-code">Código do autenticador</Label>
                    <Input
                      id="verification-code"
                      inputMode="numeric"
                      value={verificationCode}
                      onChange={(e) =>
                        setVerificationCode(
                          e.target.value.replace(/\D/g, "").slice(0, 6)
                        )
                      }
                      placeholder="123456"
                      className="mt-2"
                    />
                  </div>
                  <Button
                    onClick={handleVerifyTwoFactor}
                    disabled={is2faLoading || verificationCode.length < 6}
                  >
                    Verificar e activar 2FA
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Se o QR code não abrir, copie manualmente a URI:{" "}
                    <span className="break-all">{setupPayload.otpauthUrl}</span>
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4 rounded-xl border border-border/50 bg-accent/40 p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 h-5 w-5 text-primary" />
              <div className="space-y-1">
                <p className="font-medium">2FA activo</p>
                <p className="text-sm text-muted-foreground">
                  O login exige um código do autenticador. Pode desactivar com
                  senha atual ou código 2FA.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="disable-password">Senha actual</Label>
                <Input
                  id="disable-password"
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Opcional se usar código 2FA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="disable-code">Código 2FA</Label>
                <Input
                  id="disable-code"
                  inputMode="numeric"
                  value={disableCode}
                  onChange={(e) =>
                    setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="Opcional se usar senha"
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
                  A processar...
                </>
              ) : (
                "Desactivar 2FA"
              )}
            </Button>
          </div>
        )}

        {recoveryCodes.length > 0 ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="mb-3 text-sm font-medium">Códigos de recuperação</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {recoveryCodes.map((code) => (
                <div
                  key={code}
                  className="rounded-md border border-border/50 bg-background px-3 py-2 font-mono text-sm"
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
            Sessões Ativas
          </Label>
          <p className="text-sm text-muted-foreground">
            Revogue sessões antigas ou suspeitas. A sessão atual é marcada.
          </p>
        </div>

        {isSessionsLoading ? (
          <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-card/50 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            A carregar sessões...
          </div>
        ) : (
          <div className="max-w-xl space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-card/50 p-4 backdrop-blur-xl transition-all hover:bg-card/60"
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
                          Atual
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {session.ipAddress || "IP não disponível"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(session.lastActiveAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Criada em {formatDateTime(session.createdAt)}
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
                        Revogar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revogar sessão?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação termina o acesso do dispositivo selecionado.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRevokeSession(session.id)}
                          className="bg-destructive text-white hover:bg-destructive/90"
                        >
                          Revogar sessão
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

      <div className="rounded-xl border border-border/50 bg-accent/50 p-4 shadow-lg">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="text-sm">
            <p className="mb-1 font-medium text-foreground">Dicas de Segurança</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>Use uma senha forte e única para a sua conta.</li>
              <li>Active o 2FA antes de adicionar créditos ou exportar documentos.</li>
              <li>Revogue sessões antigas depois de usar computadores partilhados.</li>
              <li>Guarde os códigos de recuperação fora do browser.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
