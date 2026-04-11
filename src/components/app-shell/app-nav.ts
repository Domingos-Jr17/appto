import { FolderKanban, Home, CreditCard } from "lucide-react";

type AppNavLabelKey = "home" | "works" | "packages";

type AppNavItemDefinition = {
  href: string;
  labelKey: AppNavLabelKey;
  icon: typeof Home;
};

const APP_NAV_ITEM_DEFINITIONS: AppNavItemDefinition[] = [
  { href: "/app", labelKey: "home", icon: Home },
  { href: "/app/trabalhos", labelKey: "works", icon: FolderKanban },
  { href: "/app/subscription", labelKey: "packages", icon: CreditCard },
];

const DEFAULT_NAV_LABELS: Record<AppNavLabelKey, string> = {
  home: "Home",
  works: "Works",
  packages: "Packages",
};

export function getAppNavItems(t?: (key: AppNavLabelKey) => string) {
  return APP_NAV_ITEM_DEFINITIONS.map((item) => ({
    href: item.href,
    label: t ? t(item.labelKey) : DEFAULT_NAV_LABELS[item.labelKey],
    icon: item.icon,
  }));
}

export const appNavItems = getAppNavItems();

export function isNavActive(currentPath: string, href: string) {
  if (href === "/app") {
    return currentPath === href;
  }

  return currentPath === href || currentPath.startsWith(`${href}/`);
}
