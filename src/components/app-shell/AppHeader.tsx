"use client";

import { PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./UserMenu";

interface AppHeaderProps {
  title: string;
  onOpenMobileNav?: () => void;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function AppHeader({ title, onOpenMobileNav, user }: AppHeaderProps) {
  return (
    <header className="shrink-0 border-b border-border/50 px-4 py-3 lg:px-6 lg:py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {onOpenMobileNav ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full lg:hidden"
              onClick={onOpenMobileNav}
              aria-label="Abrir navegação"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          ) : null}
          <h1 className="truncate text-lg font-semibold tracking-tight lg:text-xl">{title}</h1>
        </div>

        <UserMenu user={user} />
      </div>
    </header>
  );
}
