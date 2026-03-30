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
    <div className="space-y-6">
      <div className="glass glass-border shadow-soft rounded-2xl px-5 py-4">
        <p className="text-sm text-muted-foreground">
          Gira preferências, segurança e dados da conta num fluxo
          consistente com o resto do produto.
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
        <TabsList className="glass glass-border shadow-soft flex h-auto w-full flex-wrap justify-start gap-2 rounded-2xl p-2">
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
            <Card className="glass glass-border shadow-soft rounded-2xl bg-card">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="text-xl">{tab.label}</CardTitle>
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
