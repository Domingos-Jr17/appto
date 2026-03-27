"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
        description: "Gira as suas informações pessoais",
    },
    {
        value: "preferencias",
        label: "Preferências",
        icon: Settings,
        description: "Personalize a sua experiência",
    },
    {
        value: "seguranca",
        label: "Segurança",
        icon: Shield,
        description: "Definições de segurança da conta",
    },
    {
        value: "notificacoes",
        label: "Notificações",
        icon: Bell,
        description: "Gira as suas preferências de notificação",
    },
    {
        value: "conta",
        label: "Conta",
        icon: UserCircle,
        description: "Gestão da conta",
    },
];

export default function SettingsPage() {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const requestedTab = searchParams.get("tab") || "perfil";
    const activeTab = tabs.some((tab) => tab.value === requestedTab) ? requestedTab : "perfil";

    return (
        <div className="space-y-6">
            <div className="surface-panel rounded-xl px-5 py-4">
                <p className="text-sm text-muted-foreground">
                    Gira preferências, segurança, notificações e dados da conta
                    num fluxo mais consistente com o resto do produto.
                </p>
            </div>

            <Tabs
                value={activeTab}
                onValueChange={(value) => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.set("tab", value);
                    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                }}
                className="w-full"
            >
                <div className="flex flex-col gap-6 lg:flex-row">
                    <div className="lg:w-64 shrink-0">
                        <TabsList className="surface-panel flex h-auto w-full flex-col gap-1 rounded-xl p-2">
                            {tabs.map((tab) => (
                                <TabsTrigger
                                    key={tab.value}
                                    value={tab.value}
                                    className="w-full justify-start gap-3 rounded-xl px-3 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-accent/50 transition-colors"
                                >
                                    <tab.icon className="h-4 w-4" />
                                    <span className="font-medium">
                                        {tab.label}
                                    </span>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    <div className="flex-1 min-w-0">
                        {tabs.map((tab) => (
                            <TabsContent
                                key={tab.value}
                                value={tab.value}
                                className="mt-0 focus-visible:outline-none"
                            >
                                <Card className="surface-panel rounded-xl bg-card">
                                    <CardHeader className="border-b border-border/50">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-2xl bg-primary/10 p-2.5">
                                                <tab.icon className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-xl">
                                                    {tab.label}
                                                </CardTitle>
                                                <CardDescription>
                                                    {tab.description}
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        {tab.value === "perfil" && (
                                            <ProfileSection />
                                        )}
                                        {tab.value === "preferencias" && (
                                            <PreferencesSection />
                                        )}
                                        {tab.value === "seguranca" && (
                                            <SecuritySection />
                                        )}
                                        {tab.value === "notificacoes" && (
                                            <NotificationsSection />
                                        )}
                                        {tab.value === "conta" && (
                                            <AccountSection />
                                        )}
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
