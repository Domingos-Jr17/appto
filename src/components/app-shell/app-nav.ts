import { Coins, FolderKanban, Home, Settings } from "lucide-react";

export const appNavItems = [
  { href: "/app", label: "Início", icon: Home },
  { href: "/app/sessoes", label: "Trabalhos", icon: FolderKanban },
  { href: "/app/credits", label: "Créditos", icon: Coins },
  { href: "/app/settings", label: "Definições", icon: Settings },
] as const;

export function isNavActive(currentPath: string, href: string) {
  if (href === "/app") {
    return currentPath === href;
  }

  return currentPath === href || currentPath.startsWith(`${href}/`);
}
