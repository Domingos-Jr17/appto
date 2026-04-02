import { Coins, FolderKanban, Home, CreditCard } from "lucide-react";

export const appNavItems = [
  { href: "/app", label: "Início", icon: Home },
  { href: "/app/trabalhos", label: "Trabalhos", icon: FolderKanban },
  { href: "/app/subscription", label: "Planos", icon: CreditCard },
  { href: "/app/credits", label: "Créditos", icon: Coins },
] as const;

export function isNavActive(currentPath: string, href: string) {
  if (href === "/app") {
    return currentPath === href;
  }

  return currentPath === href || currentPath.startsWith(`${href}/`);
}
