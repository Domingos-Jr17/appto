"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Camera,
  CheckCircle,
  Loader2,
  Upload,
  User,
  Mail,
} from "lucide-react";

interface UserData {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  credits: number;
}

export function ProfileSection() {
  const { data: session, update } = useSession();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const [isEmailVerified, setIsEmailVerified] = useState(true);

  // Load user data
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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
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
      // Convert to base64 for demo (in production, use proper file upload)
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;

        const response = await fetch("/api/user", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });

        if (response.ok) {
          toast({
            title: "Foto actualizada",
            description: "A sua foto de perfil foi actualizada",
          });
          // Update session
          await update();
        } else {
          throw new Error("Erro ao actualizar foto");
        }
        setAvatarUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível actualizar a foto",
        variant: "destructive",
      });
      setAvatarUploading(false);
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

      toast({
        title: "Perfil actualizado",
        description: "As suas informações foram salvas com sucesso",
      });

      // Update session
      await update();
    } catch (error) {
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
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="space-y-8">
      {/* Avatar Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="relative group">
          <Avatar className="h-24 w-24 border-2 border-border">
            <AvatarImage src={user?.image || undefined} alt={user?.name || "User"} />
            <AvatarFallback className="text-2xl bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <label
            htmlFor="avatar-upload"
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            {avatarUploading ? (
              <Loader2 className="h-6 w-6 text-white animate-spin" />
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
              <Button
                variant="outline"
                size="sm"
                asChild
                disabled={avatarUploading}
              >
                <span>
                  {avatarUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
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

      {/* Form Fields */}
      <div className="grid gap-6">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Nome completo
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            placeholder="Seu nome completo"
            className="max-w-md"
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Email
            {isEmailVerified && (
              <span className="flex items-center gap-1 text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                <CheckCircle className="h-3 w-3" />
                Verificado
              </span>
            )}
          </Label>
          <div className="flex gap-2 items-center max-w-md">
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

      {/* Account Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Informações da Conta</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-sm text-muted-foreground">Tipo de Conta</p>
            <p className="font-medium capitalize">{user?.role || "Estudante"}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-sm text-muted-foreground">Créditos Disponíveis</p>
            <p className="font-medium">{user?.credits?.toLocaleString() || 0} créditos</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
