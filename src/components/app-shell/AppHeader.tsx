"use client";

import { UserMenu } from "./UserMenu";

interface AppHeaderProps {
  title: string;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function AppHeader({ title, user }: AppHeaderProps) {
  return (
    <header className="shrink-0 border-b border-border/60 px-4 py-3 lg:px-6 lg:py-4">
      <div className="flex items-center justify-between">
        <h1 className="truncate text-lg font-semibold tracking-tight lg:text-xl">{title}</h1>
        <UserMenu user={user} />
      </div>
    </header>
  );
}
