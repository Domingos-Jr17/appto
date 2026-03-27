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
import { NotificationsSection } from "@/components/settings/NotificationsSection";
import { AccountSection } from "@/components/settings/AccountSection";
import { getActiveSettingsTab, SETTINGS_TABS } from "@/lib/workspace-ui";

export default function SettingsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = getActiveSettingsTab(searchParams.get("tab"));

  return (
    <div className="space-y-6">
      <div className="surface-panel rounded-xl px-5 py-4">
        <p className="text-sm text-muted-foreground">
          Gira preferências, segurança, notificações e dados da conta num fluxo
          mais consistente com o resto do produto.
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
        <TabsList className="surface-panel flex h-auto w-full flex-wrap justify-start gap-2 rounded-xl p-2">
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
            <Card className="surface-panel rounded-xl bg-card">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="text-xl">{tab.label}</CardTitle>
                <CardDescription>{tab.description}</CardDescription>
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
      </Tabs>
    </div>
  );
}
