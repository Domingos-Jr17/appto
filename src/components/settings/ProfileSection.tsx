"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Camera, CheckCircle, Loader2, Mail, Upload, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

type UploadIntentResponse = {
  file: {
    id: string;
  };
  upload: {
    method: string;
    uploadUrl: string;
    headers: Record<string, string>;
  };
};

export function ProfileSection() {
  const { data: session, update } = useSession();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const [isEmailVerified] = useState(true);

  useEffect(() => {
    if (session?.user) {
      setFormData({
        name: session.user.name || "",
        email: session.user.email || "",
      });
    }
  }, [session]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Ficheiro muito grande",
        description: "O tamanho máximo é 2MB",
        variant: "destructive",
      });
      return;
    }

    setAvatarUploading(true);

    try {
      const intentResponse = await fetch("/api/files/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "AVATAR",
          originalName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      });

      if (!intentResponse.ok) {
        throw new Error("Erro ao iniciar upload");
      }

      const intentData = (await intentResponse.json()) as UploadIntentResponse;
      const uploadResponse = await fetch(intentData.upload.uploadUrl, {
        method: intentData.upload.method,
        headers: intentData.upload.headers,
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Erro ao enviar ficheiro");
      }

      const completeResponse = await fetch("/api/files/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: intentData.file.id }),
      });

      if (!completeResponse.ok) {
        throw new Error("Erro ao concluir upload");
      }

      const completeData = await completeResponse.json();
      const updateResponse = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: completeData.file.contentUrl }),
      });

      if (!updateResponse.ok) {
        throw new Error("Erro ao actualizar foto");
      }

      await update();
      toast({
        title: "Foto actualizada",
        description: "A sua foto de perfil foi actualizada",
      });
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível actualizar a foto",
        variant: "destructive",
      });
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.name }),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar");
      }

      await update();
      toast({
        title: "Perfil actualizado",
        description: "As suas informações foram salvas com sucesso",
      });
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const user = session?.user;
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((name) => name[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <div className="group relative">
          <Avatar className="h-24 w-24 border-2 border-border">
            <AvatarImage src={user?.image || undefined} alt={user?.name || "User"} />
            <AvatarFallback className="bg-primary/10 text-2xl text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <label
            htmlFor="avatar-upload"
            className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
          >
            {avatarUploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            ) : (
              <Camera className="h-6 w-6 text-white" />
            )}
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
              disabled={avatarUploading}
            />
          </label>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Foto de Perfil</h3>
          <p className="text-sm text-muted-foreground">
            JPG, GIF ou PNG. Máximo de 2MB.
          </p>
          <div className="flex gap-2">
            <label htmlFor="avatar-upload-btn">
              <Button variant="outline" size="sm" asChild disabled={avatarUploading}>
                <span>
                  {avatarUploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {avatarUploading ? "Enviando..." : "Carregar foto"}
                </span>
              </Button>
              <input
                id="avatar-upload-btn"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={avatarUploading}
              />
            </label>
          </div>
        </div>
      </div>

      <Separator />

      <div className="grid gap-6">
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Nome completo
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(event) => handleInputChange("name", event.target.value)}
            placeholder="Seu nome completo"
            className="max-w-md"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Email
            {isEmailVerified ? (
              <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-500">
                <CheckCircle className="h-3 w-3" />
                Verificado
              </span>
            ) : null}
          </Label>
          <div className="flex max-w-md items-center gap-2">
            <Input
              id="email"
              type="email"
              value={formData.email}
              disabled
              className="flex-1 bg-muted/50"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            O email não pode ser alterado. Contacte o suporte se precisar de ajuda.
          </p>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Informações da Conta</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Tipo de Conta</p>
            <p className="font-medium capitalize">{user?.role || "Estudante"}</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Créditos Disponíveis</p>
            <p className="font-medium">
              {user?.credits?.toLocaleString() || 0} créditos
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
              Salvando...
            </>
          ) : (
            "Salvar alterações"
          )}
        </Button>
      </div>
    </div>
  );
}
