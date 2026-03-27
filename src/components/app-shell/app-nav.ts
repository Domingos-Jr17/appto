import { Coins, FolderKanban, House, Settings } from "lucide-react";

export const appNavItems = [
  { href: "/app", label: "Início", icon: House },
  { href: "/app/sessoes", label: "Sessões", icon: FolderKanban },
  { href: "/app/credits", label: "Créditos", icon: Coins },
  { href: "/app/settings", label: "Definições", icon: Settings },
] as const;

export function isAppNavActive(currentPath: string, href: string) {
  if (href === "/app") return currentPath === "/app";
  return currentPath === href || currentPath.startsWith(`${href}/`);
}
