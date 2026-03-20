"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Mail,
  Bell,
  FileText,
  Users,
  Gift,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Calendar,
  Shield,
} from "lucide-react";

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  email: boolean;
  push: boolean;
}

const defaultSettings: NotificationSetting[] = [
  {
    id: "projects",
    title: "Actualizações de Projectos",
    description: "Notificações sobre mudanças em seus projectos",
    icon: FileText,
    email: true,
    push: true,
  },
  {
    id: "citations",
    title: "Citações e Referências",
    description: "Quando novas citações são adicionadas ou actualizadas",
    icon: MessageSquare,
    email: true,
    push: false,
  },
  {
    id: "collaboration",
    title: "Colaboração",
    description: "Convites para colaborar e actualizações de equipa",
    icon: Users,
    email: true,
    push: true,
  },
  {
    id: "deadlines",
    title: "Prazos e Lembretes",
    description: "Alertas sobre prazos de entrega e revisões",
    icon: Calendar,
    email: true,
    push: true,
  },
  {
    id: "security",
    title: "Alertas de Segurança",
    description: "Atividades suspeitas e alterações na conta",
    icon: Shield,
    email: true,
    push: true,
  },
  {
    id: "product",
    title: "Novidades do Produto",
    description: "Novos recursos e melhorias na plataforma",
    icon: Gift,
    email: false,
    push: false,
  },
];

interface SettingsData {
  emailNotifications: boolean;
  marketingEmails: boolean;
}

export function NotificationsSection() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [settings, setSettings] = useState<NotificationSetting[]>(defaultSettings);
  const [emailDigest, setEmailDigest] = useState("daily");
  const [preferences, setPreferences] = useState<SettingsData>({
    emailNotifications: true,
    marketingEmails: false,
  });

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setPreferences({
          emailNotifications: data.emailNotifications ?? true,
          marketingEmails: data.marketingEmails ?? false,
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleToggle = (id: string, type: "email" | "push") => {
    setSettings((prev) =>
      prev.map((setting) =>
        setting.id === id
          ? { ...setting, [type]: !setting[type] }
          : setting
      )
    );
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailNotifications: preferences.emailNotifications,
          marketingEmails: preferences.marketingEmails,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar");
      }

      toast({
        title: "Preferências salvas",
        description: "As suas preferências de notificação foram actualizadas",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as preferências",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Email Notifications */}
      <div className="space-y-4">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Notificações por Email
          </Label>
          <p className="text-sm text-muted-foreground">
            Escolha quais notificações deseja receber por email
          </p>
        </div>

        <div className="space-y-4">
          {settings.map((setting) => (
            <div
              key={setting.id}
              className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-xl hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <setting.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <Label className="font-medium">{setting.title}</Label>
                  <p className="text-sm text-muted-foreground">
                    {setting.description}
                  </p>
                </div>
              </div>
              <Switch
                checked={setting.email}
                onCheckedChange={() => handleToggle(setting.id, "email")}
              />
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Push Notifications */}
      <div className="space-y-4">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-muted-foreground" />
            Notificações Push
          </Label>
          <p className="text-sm text-muted-foreground">
            Notificações em tempo real no navegador
          </p>
        </div>

        <div className="space-y-4">
          {settings.map((setting) => (
            <div
              key={setting.id}
              className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-xl hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <setting.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <Label className="font-medium">{setting.title}</Label>
                  <p className="text-sm text-muted-foreground">
                    {setting.description}
                  </p>
                </div>
              </div>
              <Switch
                checked={setting.push}
                onCheckedChange={() => handleToggle(setting.id, "push")}
              />
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Email Digest */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base">
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
            Frequência do Resumo por Email
          </Label>
          <p className="text-sm text-muted-foreground">
            Com que frequência deseja receber um resumo das actividades
          </p>
        </div>
        <Select value={emailDigest} onValueChange={setEmailDigest}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="realtime">Tempo real</SelectItem>
            <SelectItem value="daily">Diário</SelectItem>
            <SelectItem value="weekly">Semanal</SelectItem>
            <SelectItem value="never">Nunca</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Marketing Emails */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2 text-base">
            <Gift className="h-4 w-4 text-muted-foreground" />
            Emails de Marketing
          </Label>
          <p className="text-sm text-muted-foreground">
            Receba dicas, tutoriais e ofertas especiais
          </p>
        </div>
        <Switch
          checked={preferences.marketingEmails}
          onCheckedChange={(checked) => 
            setPreferences((prev) => ({ ...prev, marketingEmails: checked }))
          }
        />
      </div>

      <Separator />

      {/* Info Box */}
      <div className="bg-accent/50 backdrop-blur-xl border border-border/50 rounded-xl p-4 shadow-lg">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground mb-1">
              Sobre as notificações
            </p>
            <p className="text-muted-foreground">
              Notificações importantes sobre segurança da conta serão sempre
              enviadas por email, independente das configurações acima.
            </p>
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
            "Salvar preferências"
          )}
        </Button>
      </div>
    </div>
  );
}
