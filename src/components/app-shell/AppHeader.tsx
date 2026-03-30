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
        <header className="bg-sidebar shrink-0 rounded-2xl border border-sidebar-border text-sidebar-foreground px-4 py-1 lg:px-6 lg:py-2">
            <div className="flex items-center justify-between">
                <h1 className="truncate text-lg font-semibold tracking-tight lg:text-xl">
                    {title}
                </h1>
                <UserMenu user={user} />
            </div>
        </header>
    );
}
