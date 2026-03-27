"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import type { SidebarProject } from "./ProjectSidebar";
import { workspaceNavItems } from "./workspaceNav";

interface GlobalSearchProps {
  projects: SidebarProject[];
}

export function GlobalSearch({ projects }: GlobalSearchProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const sortedProjects = React.useMemo(
    () => [...projects].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
    [projects]
  );
  const filteredProjects = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return sortedProjects.slice(0, 30);
    }

    return sortedProjects
      .filter((project) => {
        const title = project.title.toLowerCase();
        return title.includes(normalizedQuery);
      })
      .slice(0, 30);
  }, [query, sortedProjects]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      const target = event.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName.toLowerCase();
        const isEditable =
          target.isContentEditable ||
          tagName === "input" ||
          tagName === "textarea" ||
          tagName === "select";

        if (isEditable) return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const openAndClose = (href: string) => {
    setQuery("");
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="hidden min-w-52 justify-between rounded-full border-border/60 bg-background/70 text-muted-foreground md:inline-flex"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          Pesquisar sessões, páginas ou ações...
        </span>
        <span className="rounded-full border border-border/70 px-2 py-0.5 text-xs text-foreground/80">
          Ctrl K
        </span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="rounded-full md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Abrir pesquisa global"
      >
        <Search className="h-4 w-4" />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Pesquisar sessões, páginas ou ações rápidas..."
        />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

          <CommandGroup heading="Ações rápidas">
            <CommandItem onSelect={() => openAndClose("/app/sessoes?new=1")}>Nova sessão</CommandItem>
            <CommandItem onSelect={() => openAndClose("/app/credits")}>Ver saldo de créditos</CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Navegação">
            {workspaceNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem key={item.href} onSelect={() => openAndClose(item.href)}>
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Sessões">
            {filteredProjects.map((project) => (
              <CommandItem key={project.id} onSelect={() => openAndClose(`/app/sessoes/${project.id}`)}>
                <span className="flex flex-1 flex-col">
                  <span>{project.title}</span>
                  <span className="text-xs text-muted-foreground">{project.wordCount.toLocaleString("pt-MZ")} palavras</span>
                </span>
                <CommandShortcut>Abrir</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
