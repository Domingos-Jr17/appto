"use client";

import { useState, type ReactNode } from "react";
import { Bot, FileText, ListTree } from "lucide-react";
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

  return (
    <>
      {/* DESKTOP: sidebar + document */}
      <div className="hidden h-full lg:flex">
        <WorkspaceSidebar
          project={project}
          sections={sections}
          activeSectionId={activeSectionId}
          onSectionSelect={onSectionSelect}
          assistant={chat}
        />
        <div className="min-w-0 flex-1 overflow-hidden">{document}</div>
      </div>

      {/* MOBILE: tabs */}
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
                  : "text-muted-foreground",
              )}
            >
              <FileText className="h-4 w-4" />
              Documento
            </button>
            <button
              type="button"
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
          {mobileTab === "document"
            ? document
            : mobileTab === "structure"
              ? (
                <div className="h-full overflow-y-auto px-4 py-4">
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
              )
              : chat}
        </div>
      </div>
    </>
  );
}
