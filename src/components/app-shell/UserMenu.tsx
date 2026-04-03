"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { CreditCard, LogOut, Settings, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  align?: "start" | "center" | "end";
  className?: string;
  showIdentity?: boolean;
  compact?: boolean;
}

export function UserMenu({
  user,
  align = "end",
  className,
  showIdentity = true,
  compact = false,
}: UserMenuProps) {
  const initials = (user.name || "A")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            compact
              ? "flex w-full items-center gap-2 rounded-2xl border border-sidebar-border/80 bg-sidebar-accent/50 px-3 py-2.5 text-left transition-colors hover:bg-sidebar-accent"
              : "flex items-center gap-3 rounded-full border border-border/60 bg-card/70 px-2.5 py-2 text-left transition-colors hover:bg-accent/60",
            className
          )}
          aria-label="Abrir menu da conta"
        >
          <Avatar className={cn(compact ? "h-8 w-8 border border-sidebar-border/80" : "h-9 w-9 border border-border/80")}>
            <AvatarImage src={user.image || undefined} alt={user.name || "Utilizador"} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          {showIdentity ? (
            <div className={cn("min-w-0", compact ? "block flex-1" : "hidden sm:block")}>
              <p className={cn(compact ? "truncate text-xs font-medium text-sidebar-foreground" : "truncate text-sm font-medium text-foreground")}>
                {user.name || "Utilizador"}
              </p>
              <p className={cn(compact ? "truncate text-[11px] text-sidebar-foreground/60" : "truncate text-xs text-muted-foreground")}>
                {user.email || "Sem email"}
              </p>
            </div>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-64">
        <DropdownMenuLabel className="space-y-1 px-2 py-2 font-normal">
          <p className="truncate text-sm font-medium text-foreground">{user.name || "Utilizador"}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email || "Sem email"}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/settings?tab=perfil">
            <UserRound className="mr-2 h-4 w-4" />
            Perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app/settings?tab=preferencias">
            <Settings className="mr-2 h-4 w-4" />
            Definições
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app/subscription">
            <CreditCard className="mr-2 h-4 w-4" />
            Pacotes
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => void signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Terminar sessão
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
