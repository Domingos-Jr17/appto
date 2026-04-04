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
        throw new Error("Erro ao exportar dados");
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
        title: "Dados exportados",
        description: "O ficheiro foi descarregado com sucesso",
      });
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível exportar os dados",
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
        throw new Error(data.error || "Erro ao eliminar conta");
      }

      toast({
        title: "Conta eliminada",
        description: "A tua conta foi eliminada com sucesso",
      });

      await signOut({ redirect: false });
      router.push("/");
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível eliminar a conta",
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
    return new Date(dateString).toLocaleDateString("pt-MZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getPackageLabel = (pkg: string) => {
    const labels: Record<string, string> = {
      FREE: "Free",
      STARTER: "Starter",
      PRO: "Pro",
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
            Status da Conta
          </Label>
          <p className="text-sm text-muted-foreground">
            Informações sobre a tua conta, pacote atual e gestão comercial.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card/50 p-4 shadow-lg backdrop-blur-xl">
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-lg bg-success/10 p-2">
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-semibold text-success">Activa</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/50 p-4 shadow-lg backdrop-blur-xl">
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pacote</p>
                <p className="font-semibold">
                  {user?.subscription ? getPackageLabel(user.subscription.package) : "Gratuito"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/50 p-4 shadow-lg backdrop-blur-xl">
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Membro desde</p>
                <p className="font-semibold">
                  {user?.createdAt ? formatDate(user.createdAt) : "-"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/50 p-4 shadow-lg backdrop-blur-xl">
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <HardDrive className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Facturação</p>
                <p className="font-semibold">
                  Pacotes + trabalhos extras
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
            Exportar Dados
          </Label>
          <p className="text-sm text-muted-foreground">
            Baixe uma cópia de todos os seus dados.
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-accent/50 p-4 shadow-lg backdrop-blur-xl">
          <p className="mb-4 text-sm text-muted-foreground">
            Será descarregado um ficheiro JSON com sessões, secções,
            transacções, pacotes, trabalhos extras e configurações associadas à conta.
          </p>
          <Button variant="outline" onClick={handleExportData} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exportar dados
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
            Zona de Perigo
          </Label>
          <p className="text-sm text-muted-foreground">
            Ações irreversíveis relacionadas à tua conta.
          </p>
        </div>

        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 backdrop-blur-xl">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h4 className="mb-1 font-semibold text-destructive">Eliminar conta</h4>
              <p className="text-sm text-muted-foreground">
                Todos os seus dados serão permanentemente removidos. Esta acção
                não pode ser desfeita.
              </p>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="shrink-0">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar conta
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Eliminar conta permanentemente?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-left">
                    Esta ação é irreversível. Todos os seus dados, incluindo
                    sessões, secções e créditos, serão permanentemente removidos.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="py-4">
                  <p className="mb-2 text-sm text-muted-foreground">
                    Escreve <span className="font-bold text-foreground">EXCLUIR</span> para confirmar:
                  </p>
                  <Input
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="EXCLUIR"
                  />

                  <div className="mt-4 grid gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="delete-password">
                        Palavra-passe atual
                        <span className="ml-1 text-xs text-muted-foreground">
                          {user?.twoFactorEnabled
                            ? "(ou usa o código 2FA)"
                            : "(obrigatória)"}
                        </span>
                      </Label>
                      <Input
                        id="delete-password"
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="Introduz a tua palavra-passe"
                      />
                    </div>

                    {user?.twoFactorEnabled ? (
                      <div className="space-y-2">
                        <Label htmlFor="delete-otp">Código 2FA</Label>
                        <Input
                          id="delete-otp"
                          inputMode="numeric"
                          value={deleteOtpCode}
                          onChange={(e) =>
                            setDeleteOtpCode(
                              e.target.value.replace(/\D/g, "").slice(0, 6)
                            )
                          }
                          placeholder="123456"
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
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={
                      deleteConfirmation !== "EXCLUIR" ||
                      isDeleting ||
                      (!deletePassword && !(user?.twoFactorEnabled && deleteOtpCode))
                    }
                    className="bg-destructive text-white hover:bg-destructive/90 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Eliminando...
                      </>
                    ) : (
                      "Eliminar permanentemente"
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
            <p className="mb-1 font-medium text-foreground">Precisa de ajuda?</p>
            <p className="text-muted-foreground">
              Se estiveres a ter problemas com a tua conta, contacta o{" "}
              <a href="mailto:suporte@appto.mz" className="text-primary hover:underline">
                suporte
              </a>{" "}
              antes de eliminar a conta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
