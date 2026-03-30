"use client";

import { useState, type ReactNode } from "react";
import { Bot, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkWorkspaceLayoutProps {
  chat: ReactNode;
  document: ReactNode;
}

export function WorkWorkspaceLayout({ chat, document }: WorkWorkspaceLayoutProps) {
  const [mobileTab, setMobileTab] = useState<"document" | "chat">("document");

  return (
    <>
      <div className="hidden h-full lg:flex">
        <div className="flex min-w-0 flex-[7] flex-col">{document}</div>
        <div className="flex min-w-0 flex-[3] flex-col border-l border-border/60">{chat}</div>
      </div>

      <div className="flex h-full flex-col lg:hidden">
        <div className="glass-header shrink-0 border-b border-border/60 px-4 py-3">
          <div className="flex rounded-2xl bg-muted/35 p-1">
            <button
              type="button"
              onClick={() => setMobileTab("document")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                mobileTab === "document"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              <FileText className="h-4 w-4" />
              Documento
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("chat")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                mobileTab === "chat"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              <Bot className="h-4 w-4" />
              Melhorar com IA
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {mobileTab === "document" ? document : chat}
        </div>
      </div>
    </>
  );
}
