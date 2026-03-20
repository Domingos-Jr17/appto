"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
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

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  credits: number;
  subscription: {
    plan: string;
    status: string;
  } | null;
  createdAt: string;
}

export function AccountSection() {
  const router = useRouter();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch("/api/user");
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
      a.download = `aptto-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Dados exportados",
        description: "O ficheiro foi descarregado com sucesso",
      });
    } catch (error) {
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
        body: JSON.stringify({ confirmation: deleteConfirmation }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao eliminar conta");
      }

      toast({
        title: "Conta eliminada",
        description: "A sua conta foi eliminada com sucesso",
      });

      // Sign out and redirect
      await signOut({ redirect: false });
      router.push("/");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível eliminar a conta",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmation("");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-MZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getPlanLabel = (plan: string) => {
    const labels: Record<string, string> = {
      FREE: "Gratuito",
      STUDENT: "Estudante",
      ACADEMIC: "Académico",
    };
    return labels[plan] || plan;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { label: string; color: string }> = {
      ACTIVE: { label: "Activa", color: "text-green-500" },
      CANCELLED: { label: "Cancelada", color: "text-destructive" },
      EXPIRED: { label: "Expirada", color: "text-orange-500" },
      PENDING: { label: "Pendente", color: "text-yellow-500" },
    };
    return labels[status] || { label: status, color: "text-muted-foreground" };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Account Status */}
      <div className="space-y-4">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Status da Conta
          </Label>
          <p className="text-sm text-muted-foreground">
            Informações sobre sua conta e assinatura
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-xl shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-semibold text-green-500">Activa</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-xl shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Plano</p>
                <p className="font-semibold">
                  {user?.subscription ? getPlanLabel(user.subscription.plan) : "Gratuito"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-xl shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
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

          <div className="p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-xl shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <HardDrive className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Créditos</p>
                <p className="font-semibold">
                  {user?.credits?.toLocaleString() || 0} créditos
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Export Data */}
      <div className="space-y-4">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base">
            <Download className="h-4 w-4 text-muted-foreground" />
            Exportar Dados
          </Label>
          <p className="text-sm text-muted-foreground">
            Baixe uma cópia de todos os seus dados
          </p>
        </div>

        <div className="bg-accent/50 backdrop-blur-xl border border-border/50 rounded-xl p-4 shadow-lg">
          <p className="text-sm text-muted-foreground mb-4">
            Você receberá um arquivo JSON contendo todos os seus projectos, secções,
            créditos e configurações. O processo pode levar alguns segundos.
          </p>
          <Button variant="outline" onClick={handleExportData} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exportar dados
              </>
            )}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Danger Zone */}
      <div className="space-y-4">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base text-destructive">
            <Trash2 className="h-4 w-4" />
            Zona de Perigo
          </Label>
          <p className="text-sm text-muted-foreground">
            Acções irreversíveis relacionadas à sua conta
          </p>
        </div>

        <div className="border border-destructive/30 rounded-xl p-4 bg-destructive/5 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold text-destructive mb-1">
                Eliminar conta
              </h4>
              <p className="text-sm text-muted-foreground">
                Uma vez eliminada, a sua conta e todos os seus dados serão
                permanentemente removidos. Esta acção não pode ser desfeita.
              </p>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="shrink-0">
                  <Trash2 className="h-4 w-4 mr-2" />
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
                    Esta acção é irreversível. Todos os seus dados, incluindo
                    projectos, secções e créditos serão permanentemente
                    eliminados.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="py-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Digite <span className="font-bold text-foreground">EXCLUIR</span> para confirmar:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="EXCLUIR"
                    className="w-full h-10 px-3 rounded-md border border-input bg-input text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive/20 focus:border-destructive/50"
                  />
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteConfirmation("")}>
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmation !== "EXCLUIR" || isDeleting}
                    className="bg-destructive text-white hover:bg-destructive/90 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
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

      {/* Additional Info */}
      <div className="bg-accent/50 backdrop-blur-xl border border-border/50 rounded-xl p-4 shadow-lg">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground mb-1">
              Precisa de ajuda?
            </p>
            <p className="text-muted-foreground">
              Se você está tendo problemas com sua conta ou gostaria de
              cancelar sua assinatura, entre em contacto com nosso{" "}
              <a href="mailto:suporte@aptto.mz" className="text-primary hover:underline">
                suporte
              </a>{" "}
              antes de eliminar sua conta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
