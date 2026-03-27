"use client";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { ReactNode } from "react";

interface SessionWorkspaceLayoutProps {
  artifactCollapsed: boolean;
  mobileArtifactOpen: boolean;
  chat: ReactNode;
  artifact: ReactNode;
  onMobileArtifactOpenChange: (open: boolean) => void;
}

export function SessionWorkspaceLayout({
  artifactCollapsed,
  mobileArtifactOpen,
  chat,
  artifact,
  onMobileArtifactOpenChange,
}: SessionWorkspaceLayoutProps) {
  return (
    <>
      <div className="hidden h-full lg:block">
        <ResizablePanelGroup direction="horizontal" className="h-full w-full">
          <ResizablePanel defaultSize={artifactCollapsed ? 100 : 56} minSize={38}>
            {chat}
          </ResizablePanel>

          {!artifactCollapsed ? (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={44} minSize={28} maxSize={52}>
                {artifact}
              </ResizablePanel>
            </>
          ) : null}
        </ResizablePanelGroup>
      </div>

      <div className="flex h-full flex-col lg:hidden">{chat}</div>

      <Sheet open={mobileArtifactOpen} onOpenChange={onMobileArtifactOpenChange}>
        <SheetContent side="right" className="w-[380px] max-w-[96vw] p-0">
          <SheetTitle className="sr-only">Painel do documento</SheetTitle>
          {artifact}
        </SheetContent>
      </Sheet>
    </>
  );
}
