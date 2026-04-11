"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Home, FileText, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const pathname = usePathname();
  const t = useTranslations("appShell.mobileNav");

  const hideOnPaths = [
    /^\/app\/trabalhos\/[^/]+$/,
  ];

  const shouldHide = hideOnPaths.some((pattern) => pattern.test(pathname));

  if (shouldHide) return null;

  return (
    <nav className="fixed bottom-4 left-3 right-3 z-[var(--z-mobile)] lg:hidden">
      <div className="flex items-center justify-around rounded-full border border-border/40 bg-background/90 px-2 py-1.5 backdrop-blur-xl shadow-float-lg">
        <Link
          href="/app"
          aria-label={t("home")}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-xs transition-colors",
            pathname === "/app" || pathname === "/app/"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium">{t("home")}</span>
        </Link>

        <Link
          href="/app?new=1"
          aria-label={t("newWork")}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/30 transition-transform hover:scale-105 active:scale-95"
        >
          <Plus className="h-5 w-5" />
        </Link>

        <Link
          href="/app/trabalhos"
          aria-label={t("works")}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-xs transition-colors",
            pathname.startsWith("/app/trabalhos")
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <FileText className="h-5 w-5" />
          <span className="text-[10px] font-medium">{t("works")}</span>
        </Link>
      </div>
    </nav>
  );
}
