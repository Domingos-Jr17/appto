"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { PreferencesSection } from "@/components/settings/PreferencesSection";
import { SecuritySection } from "@/components/settings/SecuritySection";
import { AccountSection } from "@/components/settings/AccountSection";
import { getActiveSettingsTab, SETTINGS_TABS } from "@/lib/user-settings";

export default function SettingsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = getActiveSettingsTab(searchParams.get("tab"));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-[28px] bg-card border border-border/40 p-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Configurações
          </p>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Preferências e Segurança
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Gira preferências, segurança e dados da conta num fluxo
              consistente com o resto do produto.
            </p>
          </div>
        </div>
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
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 rounded-[28px] bg-muted/40 border border-border/40 p-2">
          {SETTINGS_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-full px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {SETTINGS_TABS.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className="mt-6 focus-visible:outline-none"
          >
            <Card className="rounded-[28px] bg-card border border-border/40">
              <CardHeader className="border-b border-border/60 pb-5">
                <CardTitle className="text-xl font-semibold">{tab.label}</CardTitle>
                <CardDescription>{tab.description}</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {tab.value === "perfil" && <ProfileSection />}
                {tab.value === "preferencias" && <PreferencesSection />}
                {tab.value === "seguranca" && <SecuritySection />}
                {tab.value === "conta" && <AccountSection />}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
