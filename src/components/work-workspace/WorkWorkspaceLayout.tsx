"use client";

import { useState, type ReactNode } from "react";
import { Bot, FileText, ListTree, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project, Section } from "@/types/editor";
import { WorkspaceSidebar } from "./WorkspaceSidebar";

interface WorkWorkspaceLayoutProps {
  document: ReactNode;
  chat: ReactNode;
  project: Project;
  sections: Section[];
  activeSectionId: string | null;
  onSectionSelect: (section: Section) => void;
}

type MobileTab = "document" | "structure" | "chat";

export function WorkWorkspaceLayout({
  document,
  chat,
  project,
  sections,
  activeSectionId,
  onSectionSelect,
}: WorkWorkspaceLayoutProps) {
  const [mobileTab, setMobileTab] = useState<MobileTab>("document");
  const [chatOpen, setChatOpen] = useState(true);

  return (
    <>
      {/* DESKTOP: sidebar + document + chat panel */}
      <div className="hidden h-full lg:flex">
        <WorkspaceSidebar
          project={project}
          sections={sections}
          activeSectionId={activeSectionId}
          onSectionSelect={onSectionSelect}
          footer={
            <button
              type="button"
              onClick={() => setChatOpen((prev) => !prev)}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl border border-border/60 px-3 py-2 text-xs transition-colors",
                chatOpen
                  ? "border-primary/30 bg-primary/10 text-foreground"
                  : "bg-muted/20 text-muted-foreground hover:bg-muted/35"
              )}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {chatOpen ? "Ocultar assistente" : "Mostrar assistente"}
            </button>
          }
        />
        <div className="min-w-0 flex-1 overflow-hidden">{document}</div>
         {chatOpen ? (
           <div className="shrink-0 overflow-hidden border-l border-border/60 lg:w-[280px] xl:w-[320px] 2xl:w-[360px]">
             {chat}
           </div>
         ) : null}
      </div>

      {/* MOBILE: tabs */}
      <div className="flex h-full flex-col lg:hidden">
        <div className="glass-header shrink-0 border-b border-border/60 px-4 py-3">
          <div className="flex rounded-2xl bg-muted/35 p-1" role="tablist" aria-label="Secções do workspace">
            <button
              type="button"
              role="tab"
              id="tab-document"
              aria-controls="panel-document"
              aria-selected={mobileTab === "document"}
              onClick={() => setMobileTab("document")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                mobileTab === "document"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              <FileText className="h-4 w-4" />
              Documento
            </button>
            <button
              type="button"
              role="tab"
              id="tab-structure"
              aria-controls="panel-structure"
              aria-selected={mobileTab === "structure"}
              onClick={() => setMobileTab("structure")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                mobileTab === "structure"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              <ListTree className="h-4 w-4" />
              Estrutura
            </button>
            <button
              type="button"
              role="tab"
              id="tab-chat"
              aria-controls="panel-chat"
              aria-selected={mobileTab === "chat"}
              onClick={() => setMobileTab("chat")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                mobileTab === "chat"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              <Bot className="h-4 w-4" />
              IA
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {mobileTab === "document" ? (
            <div id="panel-document" role="tabpanel" aria-labelledby="tab-document">
              {document}
            </div>
          ) : mobileTab === "structure" ? (
            <div id="panel-structure" role="tabpanel" aria-labelledby="tab-structure" className="h-full overflow-y-auto px-4 py-4">
              <WorkspaceSidebar
                project={project}
                sections={sections}
                activeSectionId={activeSectionId}
                onSectionSelect={(section) => {
                  onSectionSelect(section);
                  setMobileTab("document");
                }}
              />
            </div>
          ) : (
            <div id="panel-chat" role="tabpanel" aria-labelledby="tab-chat">
              {chat}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
