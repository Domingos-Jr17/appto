"use client";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { ReactNode } from "react";

interface WorkspaceThreePaneProps {
  sidebarCollapsed: boolean;
  artifactCollapsed: boolean;
  mobileSidebarOpen: boolean;
  mobileArtifactOpen: boolean;
  sidebar: ReactNode;
  chat: ReactNode;
  artifact: ReactNode;
  onMobileSidebarOpenChange: (open: boolean) => void;
  onMobileArtifactOpenChange: (open: boolean) => void;
}

export function WorkspaceThreePane({
  sidebarCollapsed,
  artifactCollapsed,
  mobileSidebarOpen,
  mobileArtifactOpen,
  sidebar,
  chat,
  artifact,
  onMobileSidebarOpenChange,
  onMobileArtifactOpenChange,
}: WorkspaceThreePaneProps) {
  return (
    <>
      <div className="hidden h-full lg:block">
        <ResizablePanelGroup direction="horizontal" className="h-full w-full">
          {!sidebarCollapsed ? (
            <>
              <ResizablePanel defaultSize={22} minSize={16} maxSize={28}>
                {sidebar}
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          ) : null}

          <ResizablePanel defaultSize={artifactCollapsed ? 100 : 48} minSize={36}>
            {chat}
          </ResizablePanel>

          {!artifactCollapsed ? (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={30} minSize={22} maxSize={42}>
                {artifact}
              </ResizablePanel>
            </>
          ) : null}
        </ResizablePanelGroup>
      </div>

      <div className="flex h-full flex-col lg:hidden">{chat}</div>

      <Sheet open={mobileSidebarOpen} onOpenChange={onMobileSidebarOpenChange}>
        <SheetContent side="left" className="w-[340px] max-w-[92vw] p-0">
          <SheetTitle className="sr-only">Navegação da sessão</SheetTitle>
          {sidebar}
        </SheetContent>
      </Sheet>

      <Sheet open={mobileArtifactOpen} onOpenChange={onMobileArtifactOpenChange}>
        <SheetContent side="right" className="w-[380px] max-w-[96vw] p-0">
          <SheetTitle className="sr-only">Painel do documento</SheetTitle>
          {artifact}
        </SheetContent>
      </Sheet>
    </>
  );
}
