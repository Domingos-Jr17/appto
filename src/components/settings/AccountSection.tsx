"use client";

import * as React from "react";
import { useState } from "react";
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
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const handleExportData = async () => {
    setIsExporting(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsExporting(false);
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsDeleting(false);
  };

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
                <p className="font-semibold text-green-500">Ativa</p>
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
                <p className="font-semibold">Premium</p>
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
                <p className="font-semibold">15 de Janeiro, 2025</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-xl shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <HardDrive className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Armazenamento</p>
                <p className="font-semibold">2.4 GB de 10 GB</p>
              </div>
            </div>
            <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full w-[24%] bg-primary rounded-full" />
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
            Você receberá um arquivo contendo todos os seus projetos, citações,
            referências e configurações. O processo pode levar alguns minutos.
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
                Solicitar exportação
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
            Ações irreversíveis relacionadas à sua conta
          </p>
        </div>

        <div className="border border-destructive/30 rounded-xl p-4 bg-destructive/5 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold text-destructive mb-1">
                Excluir conta
              </h4>
              <p className="text-sm text-muted-foreground">
                Uma vez excluída, sua conta e todos os seus dados serão
                permanentemente removidos. Esta ação não pode ser desfeita.
              </p>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="shrink-0">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir conta
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Excluir conta permanentemente?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-left">
                    Esta ação é irreversível. Todos os seus dados, incluindo
                    projetos, citações e referências serão permanentemente
                    excluídos.
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
                        Excluindo...
                      </>
                    ) : (
                      "Excluir permanentemente"
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
              cancelar sua assinatura, entre em contato com nosso{" "}
              <a href="#" className="text-primary hover:underline">
                suporte
              </a>{" "}
              antes de excluir sua conta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
