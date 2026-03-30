"use client";

import { useState, type ReactNode } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

interface SessionWorkspaceLayoutProps {
  chat: ReactNode;
  document: ReactNode;
}

export function SessionWorkspaceLayout({ chat, document }: SessionWorkspaceLayoutProps) {
  const [mobileDocOpen, setMobileDocOpen] = useState(false);

  return (
    <>
      <div className="hidden h-full lg:flex">
        <div className="flex min-w-0 flex-1 flex-col border-l border-border/60 order-2">{document}</div>
        <div className="flex min-w-0 flex-1 flex-col order-1">{chat}</div>
      </div>

      <div className="flex h-full flex-col lg:hidden">
        {chat}
        <div className="fixed bottom-20 right-4 z-40">
          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg"
            onClick={() => setMobileDocOpen(true)}
            aria-label="Abrir documento"
          >
            <FileText className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Sheet open={mobileDocOpen} onOpenChange={setMobileDocOpen}>
        <SheetContent side="right" className="w-full max-w-[92vw] p-0">
          <SheetTitle className="sr-only">Documento</SheetTitle>
          {document}
        </SheetContent>
      </Sheet>
    </>
  );
}
