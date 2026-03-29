"use client";

import type { ReactNode } from "react";

interface SessionWorkspaceLayoutProps {
  chat: ReactNode;
  document: ReactNode;
}

export function SessionWorkspaceLayout({ chat, document }: SessionWorkspaceLayoutProps) {
  return (
    <>
      <div className="hidden h-full lg:flex">
        <div className="flex min-w-0 flex-1 flex-col">{chat}</div>
        <div className="w-[380px] shrink-0 border-l border-border/60 xl:w-[420px]">{document}</div>
      </div>
      <div className="flex h-full flex-col lg:hidden">{chat}</div>
    </>
  );
}
