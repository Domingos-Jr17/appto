"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Settings, Shield, Bell, UserCircle } from "lucide-react";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { PreferencesSection } from "@/components/settings/PreferencesSection";
import { SecuritySection } from "@/components/settings/SecuritySection";
import { NotificationsSection } from "@/components/settings/NotificationsSection";
import { AccountSection } from "@/components/settings/AccountSection";

const tabs = [
  {
    value: "perfil",
    label: "Perfil",
    icon: User,
    description: "Gerencie suas informações pessoais",
  },
  {
    value: "preferencias",
    label: "Preferências",
    icon: Settings,
    description: "Personalize sua experiência",
  },
  {
    value: "seguranca",
    label: "Segurança",
    icon: Shield,
    description: "Configurações de segurança da conta",
  },
  {
    value: "notificacoes",
    label: "Notificações",
    icon: Bell,
    description: "Gerencie suas preferências de notificação",
  },
  {
    value: "conta",
    label: "Conta",
    icon: UserCircle,
    description: "Gerenciamento da conta",
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="rounded-[28px] border border-border/60 bg-background/75 p-5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Configurações
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie suas preferências e configurações da conta
        </p>
      </div>

      <Separator />

      {/* Settings Tabs */}
      <Tabs defaultValue="perfil" className="w-full">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 shrink-0">
            <TabsList className="flex flex-col h-auto bg-card border border-border rounded-xl p-2 gap-1 w-full">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="w-full justify-start gap-3 px-3 py-2.5 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-accent/50 transition-colors"
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="font-medium">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            {tabs.map((tab) => (
              <TabsContent
                key={tab.value}
                value={tab.value}
                className="mt-0 focus-visible:outline-none"
              >
                <Card className="border border-border bg-card shadow-sm">
                  <CardHeader className="border-b border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <tab.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{tab.label}</CardTitle>
                        <CardDescription>{tab.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {tab.value === "perfil" && <ProfileSection />}
                    {tab.value === "preferencias" && <PreferencesSection />}
                    {tab.value === "seguranca" && <SecuritySection />}
                    {tab.value === "notificacoes" && <NotificationsSection />}
                    {tab.value === "conta" && <AccountSection />}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </div>
        </div>
      </Tabs>
    </div>
  );
}
