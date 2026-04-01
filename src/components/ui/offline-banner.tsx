"use client";

import { WifiOff } from "lucide-react";
import { useOnline } from "@/hooks/use-online";

export function OfflineBanner() {
  const online = useOnline();

  if (online) return null;

  return (
    <div role="alert" aria-live="assertive" className="fixed bottom-0 left-0 right-0 z-[var(--z-toast)] flex items-center justify-center gap-2 bg-warning px-4 py-2 text-xs font-medium text-warning-foreground">
      <WifiOff className="h-3.5 w-3.5" />
      Sem ligação à internet. Algumas acções podem falhar até a ligação voltar.
    </div>
  );
}
