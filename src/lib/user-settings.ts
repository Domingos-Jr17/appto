import { z } from "zod";

export const userSettingsSchema = z.object({
  language: z.enum(["pt-MZ", "pt-BR", "en"]).default("pt-MZ"),
  citationStyle: z.enum(["ABNT", "APA", "Vancouver"]).default("ABNT"),
  fontSize: z.number().int().min(12).max(24).default(16),
  autoSave: z.boolean().default(true),
  aiTone: z.enum(["formal", "semi-formal", "casual"]).default("formal"),
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(false),
});

export type UserSettings = z.infer<typeof userSettingsSchema>;

export const DEFAULT_USER_SETTINGS: UserSettings = {
  language: "pt-MZ",
  citationStyle: "ABNT",
  fontSize: 16,
  autoSave: true,
  aiTone: "formal",
  emailNotifications: true,
  pushNotifications: false,
};

export const SETTINGS_TABS = [
  {
    value: "perfil",
    label: "Perfil",
    description: "Gira as suas informações pessoais",
  },
  {
    value: "preferencias",
    label: "Preferências",
    description: "Personalize a sua experiência",
  },
  {
    value: "seguranca",
    label: "Segurança",
    description: "Definições de segurança da conta",
  },
  {
    value: "conta",
    label: "Conta",
    description: "Gestão da conta e créditos",
  },
] as const;

export const SETTINGS_TAB_VALUES = SETTINGS_TABS.map((tab) => tab.value) as [
  (typeof SETTINGS_TABS)[number]["value"],
  ...(typeof SETTINGS_TABS)[number]["value"][],
];

export type SettingsTabValue = (typeof SETTINGS_TAB_VALUES)[number];

export function getActiveSettingsTab(requestedTab: string | null): SettingsTabValue {
  return SETTINGS_TAB_VALUES.find((tab) => tab === requestedTab) || "perfil";
}

export function normalizeSettings(raw: Record<string, unknown>): UserSettings {
  const parsed = userSettingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_USER_SETTINGS;
}
