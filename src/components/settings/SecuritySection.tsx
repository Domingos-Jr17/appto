"use client";

import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

const sessions: Session[] = [
  {
    id: "1",
    device: "Chrome - Windows",
    deviceIcon: Monitor,
    location: "Maputo, Moçambique",
    lastActive: "Agora",
    current: true,
  },
  {
    id: "2",
    device: "Safari - iPhone",
    deviceIcon: Smartphone,
    location: "Maputo, Moçambique",
    lastActive: "2 horas atrás",
    current: false,
  },
];

export function SecuritySection() {
  const { toast } = useToast();
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!passwordForm.currentPassword) {
      newErrors.currentPassword = "Senha actual é obrigatória";
    }
    if (!passwordForm.newPassword) {
      newErrors.newPassword = "Nova senha é obrigatória";
    } else if (passwordForm.newPassword.length < 6) {
      newErrors.newPassword = "A senha deve ter pelo menos 6 caracteres";
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
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível alterar a senha",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    toast({
      title: "Sessão revogada",
      description: "A sessão foi terminada com sucesso",
    });
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
            {errors.currentPassword && (
              <p className="text-xs text-destructive">{errors.currentPassword}</p>
            )}
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
            {errors.newPassword && (
              <p className="text-xs text-destructive">{errors.newPassword}</p>
            )}
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
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword}</p>
            )}
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
                        O utilizador precisará fazer login novamente.
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

      {/* Security Tips */}
      <div className="bg-accent/50 backdrop-blur-xl border border-border/50 rounded-xl p-4 shadow-lg">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground mb-1">
              Dicas de Segurança
            </p>
            <ul className="text-muted-foreground space-y-1 list-disc list-inside">
              <li>Use uma senha forte e única para a sua conta</li>
              <li>Active a autenticação de dois fatores para maior segurança</li>
              <li>Revogue sessões que não reconhece</li>
              <li>Nunca partilhe a sua senha com terceiros</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
