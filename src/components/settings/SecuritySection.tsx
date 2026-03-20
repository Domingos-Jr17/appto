"use client";

import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
  Smartphone,
  Monitor,
  Tablet,
  Eye,
  EyeOff,
  LogOut,
  Clock,
  MapPin,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

interface Session {
  id: string;
  device: string;
  deviceIcon: React.ElementType;
  location: string;
  lastActive: string;
  current: boolean;
}

interface LoginHistory {
  id: string;
  date: string;
  device: string;
  location: string;
  status: "success" | "failed";
}

const sessions: Session[] = [
  {
    id: "1",
    device: "Chrome - Windows",
    deviceIcon: Monitor,
    location: "São Paulo, Brasil",
    lastActive: "Agora",
    current: true,
  },
  {
    id: "2",
    device: "Safari - iPhone",
    deviceIcon: Smartphone,
    location: "São Paulo, Brasil",
    lastActive: "2 horas atrás",
    current: false,
  },
  {
    id: "3",
    device: "Firefox - MacBook",
    deviceIcon: Tablet,
    location: "Rio de Janeiro, Brasil",
    lastActive: "3 dias atrás",
    current: false,
  },
];

const loginHistory: LoginHistory[] = [
  {
    id: "1",
    date: "Hoje, 14:32",
    device: "Chrome - Windows",
    location: "São Paulo, Brasil",
    status: "success",
  },
  {
    id: "2",
    date: "Hoje, 09:15",
    device: "Safari - iPhone",
    location: "São Paulo, Brasil",
    status: "success",
  },
  {
    id: "3",
    date: "Ontem, 18:45",
    device: "Chrome - Windows",
    location: "São Paulo, Brasil",
    status: "success",
  },
  {
    id: "4",
    date: "15/01/2025, 22:10",
    device: "Desconhecido",
    location: "Londres, Reino Unido",
    status: "failed",
  },
  {
    id: "5",
    date: "14/01/2025, 16:20",
    device: "Firefox - MacBook",
    location: "Rio de Janeiro, Brasil",
    status: "success",
  },
];

export function SecuritySection() {
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handlePasswordChange = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };

  const handleRevokeSession = async (sessionId: string) => {
    console.log("Revoking session:", sessionId);
  };

  return (
    <div className="space-y-8">
      {/* Change Password */}
      <div className="space-y-4">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-muted-foreground" />
            Alterar Senha
          </Label>
          <p className="text-sm text-muted-foreground">
            Atualize sua senha para manter sua conta segura
          </p>
        </div>

        <div className="space-y-4 max-w-md">
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
          </div>

          <Button onClick={handlePasswordChange} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Alterando...
              </>
            ) : (
              "Alterar senha"
            )}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Two-Factor Authentication */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Autenticação de Dois Fatores
          </Label>
          <p className="text-sm text-muted-foreground">
            Adicione uma camada extra de segurança à sua conta
          </p>
        </div>
        <Switch
          checked={twoFactorEnabled}
          onCheckedChange={setTwoFactorEnabled}
        />
      </div>

      {twoFactorEnabled && (
        <div className="bg-accent/50 backdrop-blur-xl border border-border/50 rounded-xl p-4 max-w-md shadow-lg">
          <p className="text-sm text-muted-foreground">
            Configure seu aplicativo autenticador (Google Authenticator, Authy, etc.)
            para gerar códigos de verificação.
          </p>
          <Button variant="outline" size="sm" className="mt-3">
            Configurar 2FA
          </Button>
        </div>
      )}

      <Separator />

      {/* Active Sessions */}
      <div className="space-y-4">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            Sessões Ativas
          </Label>
          <p className="text-sm text-muted-foreground">
            Gerencie os dispositivos conectados à sua conta
          </p>
        </div>

        <div className="space-y-3 max-w-xl">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-xl hover:bg-card/60 hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <session.deviceIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{session.device}</span>
                    {session.current && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                        Atual
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {session.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {session.lastActive}
                    </span>
                  </div>
                </div>
              </div>

              {!session.current && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      <LogOut className="h-4 w-4 mr-1" />
                      Revogar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revogar sessão?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação fará logout do dispositivo selecionado.
                        O usuário precisará fazer login novamente.
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
              )}
            </div>
          ))}
        </div>

        {sessions.length > 1 && (
          <Button variant="outline" className="text-destructive hover:text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            Encerrar todas as outras sessões
          </Button>
        )}
      </div>

      <Separator />

      {/* Login History */}
      <div className="space-y-4">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Histórico de Login
          </Label>
          <p className="text-sm text-muted-foreground">
            Atividades recentes de login na sua conta
          </p>
        </div>

        <div className="space-y-2 max-w-xl">
          {loginHistory.map((login) => (
            <div
              key={login.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/30 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                {login.status === "success" ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                )}
                <div>
                  <div className="text-sm">
                    <span className="font-medium">{login.device}</span>
                    <span className="text-muted-foreground mx-2">•</span>
                    <span className="text-muted-foreground">{login.location}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{login.date}</span>
                </div>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  login.status === "success"
                    ? "bg-green-500/10 text-green-500"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {login.status === "success" ? "Sucesso" : "Falhou"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
