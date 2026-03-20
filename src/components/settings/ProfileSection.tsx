"use client";

import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Camera,
  CheckCircle,
  Loader2,
  Upload,
  User,
  Mail,
  Phone,
  Building2,
  GraduationCap,
  BookOpen,
} from "lucide-react";

const institutions = [
  { value: "usp", label: "Universidade de São Paulo (USP)" },
  { value: "unicamp", label: "Universidade Estadual de Campinas (UNICAMP)" },
  { value: "ufrj", label: "Universidade Federal do Rio de Janeiro (UFRJ)" },
  { value: "ufmg", label: "Universidade Federal de Minas Gerais (UFMG)" },
  { value: "ufba", label: "Universidade Federal da Bahia (UFBA)" },
  { value: "ufrgs", label: "Universidade Federal do Rio Grande do Sul (UFRGS)" },
  { value: "ufpr", label: "Universidade Federal do Paraná (UFPR)" },
  { value: "ufsc", label: "Universidade Federal de Santa Catarina (UFSC)" },
  { value: "outros", label: "Outra instituição" },
];

const courses = [
  { value: "direito", label: "Direito" },
  { value: "medicina", label: "Medicina" },
  { value: "engenharia", label: "Engenharia" },
  { value: "administracao", label: "Administração" },
  { value: "psicologia", label: "Psicologia" },
  { value: "ciencias-computacao", label: "Ciências da Computação" },
  { value: "arquitetura", label: "Arquitetura" },
  { value: "contabilidade", label: "Ciências Contábeis" },
  { value: "economia", label: "Economia" },
  { value: "outros", label: "Outro curso" },
];

const academicLevels = [
  { value: "graduacao", label: "Graduação" },
  { value: "especializacao", label: "Especialização" },
  { value: "mestrado", label: "Mestrado" },
  { value: "doutorado", label: "Doutorado" },
  { value: "pos-doutorado", label: "Pós-Doutorado" },
];

export function ProfileSection() {
  const [isLoading, setIsLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "João Silva",
    email: "joao.silva@email.com",
    phone: "(11) 99999-9999",
    institution: "usp",
    course: "direito",
    academicLevel: "graduacao",
  });
  const [emailVerified] = useState(true);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = async () => {
    setAvatarUploading(true);
    // Simulate upload
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setAvatarUploading(false);
  };

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  return (
    <div className="space-y-8">
      {/* Avatar Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="relative group">
          <Avatar className="h-24 w-24 border-2 border-border">
            <AvatarImage src="/avatar.png" alt="João Silva" />
            <AvatarFallback className="text-2xl bg-primary/10 text-primary">
              JS
            </AvatarFallback>
          </Avatar>
          <button
            onClick={handleAvatarChange}
            disabled={avatarUploading}
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            {avatarUploading ? (
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            ) : (
              <Camera className="h-6 w-6 text-white" />
            )}
          </button>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Foto de Perfil</h3>
          <p className="text-sm text-muted-foreground">
            JPG, GIF ou PNG. Máximo de 2MB.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAvatarChange}
              disabled={avatarUploading}
            >
              {avatarUploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {avatarUploading ? "Enviando..." : "Carregar foto"}
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
              Remover
            </Button>
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
            {emailVerified && (
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
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="seu@email.com"
              className="flex-1"
            />
            {!emailVerified && (
              <Button variant="outline" size="sm">
                Verificar
              </Button>
            )}
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            Telefone
          </Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange("phone", e.target.value)}
            placeholder="(00) 00000-0000"
            className="max-w-md"
          />
        </div>
      </div>

      <Separator />

      {/* Academic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          Informações Acadêmicas
        </h3>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Institution */}
          <div className="space-y-2">
            <Label htmlFor="institution" className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Instituição
            </Label>
            <Select
              value={formData.institution}
              onValueChange={(value) => handleInputChange("institution", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione sua instituição" />
              </SelectTrigger>
              <SelectContent>
                {institutions.map((inst) => (
                  <SelectItem key={inst.value} value={inst.value}>
                    {inst.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Course */}
          <div className="space-y-2">
            <Label htmlFor="course" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              Curso
            </Label>
            <Select
              value={formData.course}
              onValueChange={(value) => handleInputChange("course", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione seu curso" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.value} value={course.value}>
                    {course.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Academic Level */}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="academicLevel" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              Nível Acadêmico
            </Label>
            <Select
              value={formData.academicLevel}
              onValueChange={(value) => handleInputChange("academicLevel", value)}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Selecione seu nível" />
              </SelectTrigger>
              <SelectContent>
                {academicLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
