"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MoreHorizontal, PanelLeftClose, PanelLeftOpen, Search, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { WorkspaceConversationItem } from "./workspace-types";

interface SidebarUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface ConversationSidebarProps {
  projectId: string;
  user: SidebarUser;
  conversations: WorkspaceConversationItem[];
  activeConversationId: string;
  collapsed: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onRenameConversation: (conversationId: string, title: string) => void;
  onTogglePinConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onToggleCollapsed: () => void;
}

function getInitials(name?: string | null) {
  return (name || "A")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface ConversationActionsProps {
  conversation: WorkspaceConversationItem;
  onRename: (conversation: WorkspaceConversationItem) => void;
  onTogglePin: (conversationId: string) => void;
  onDelete: (conversationId: string) => void;
}

function ConversationActions({
  conversation,
  onRename,
  onTogglePin,
  onDelete,
}: ConversationActionsProps) {
  return (
    <>
      <ContextMenuItem onClick={() => onTogglePin(conversation.id)}>
        {conversation.pinned ? "Desafixar" : "Favoritar"}
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onRename(conversation)}>
        Mudar o nome
      </ContextMenuItem>
      <ContextMenuItem>Adicionar ao projecto</ContextMenuItem>
      <ContextMenuItem variant="destructive" onClick={() => onDelete(conversation.id)}>
        Apagar
      </ContextMenuItem>
    </>
  );
}

export function ConversationSidebar({
  projectId,
  user,
  conversations,
  activeConversationId,
  collapsed,
  search,
  onSearchChange,
  onSelectConversation,
  onRenameConversation,
  onTogglePinConversation,
  onDeleteConversation,
  onToggleCollapsed,
}: ConversationSidebarProps) {
  const initials = getInitials(user.name);
  const [renameTarget, setRenameTarget] = useState<WorkspaceConversationItem | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  const renameOpen = Boolean(renameTarget);
  const renameDisabled = useMemo(() => !draftTitle.trim(), [draftTitle]);

  const openRenameDialog = (conversation: WorkspaceConversationItem) => {
    setRenameTarget(conversation);
    setDraftTitle(conversation.title);
  };

  const closeRenameDialog = () => {
    setRenameTarget(null);
    setDraftTitle("");
  };

  const submitRename = () => {
    if (!renameTarget || !draftTitle.trim()) return;
    onRenameConversation(renameTarget.id, draftTitle.trim());
    closeRenameDialog();
  };

  return (
    <aside className="flex h-full flex-col border-r border-[#e8dfd2] bg-[#f7f1e7] text-[#2c241d] dark:border-[#2f2923] dark:bg-[#171412] dark:text-[#efe7dc]">
      <div className="border-b border-inherit px-4 pb-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#d97845] text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            {!collapsed ? (
              <div>
                <p className="text-sm font-semibold tracking-tight">appto workspace</p>
                <p className="text-xs text-[#7a6756] dark:text-[#a69281]">Claude-like, focado no projecto</p>
              </div>
            ) : null}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full text-current hover:bg-black/5 dark:hover:bg-white/5"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>

        {!collapsed ? (
          <div className="mt-4 space-y-3">
            <Button asChild className="h-11 w-full justify-start rounded-2xl bg-[#2f241d] text-[#f8efe5] hover:bg-[#201711] dark:bg-[#efe7dc] dark:text-[#211a15] dark:hover:bg-[#ddd3c7]">
              <Link href={`/app/projects/${projectId}/workspace`}>Novo bate-papo</Link>
            </Button>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b7765]" />
              <Input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Procurar conversas"
                className="h-10 rounded-2xl border-[#e2d6c8] bg-white/70 pl-9 text-sm shadow-none dark:border-[#3a322b] dark:bg-[#201b17]"
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        {collapsed ? (
          <div className="space-y-2">
            {conversations.slice(0, 6).map((conversation) => (
              <Button
                key={conversation.id}
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "h-10 w-full rounded-2xl border border-transparent text-current hover:bg-black/5 dark:hover:bg-white/5",
                  conversation.id === activeConversationId && "border-[#ddc8af] bg-[#eadfce] dark:border-[#4c4035] dark:bg-[#221d18]"
                )}
                onClick={() => onSelectConversation(conversation.id)}
                aria-label={conversation.title}
              >
                <span className="text-xs font-semibold">{conversation.title.slice(0, 1).toUpperCase()}</span>
              </Button>
            ))}
          </div>
        ) : (
          <div>
            <div className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b7765] dark:text-[#a69281]">
              Conversas recentes
            </div>
            <div className="space-y-1.5">
              {conversations.map((conversation) => (
                <ContextMenu key={conversation.id}>
                  <ContextMenuTrigger asChild>
                    <div
                      className={cn(
                        "group flex items-start gap-2 rounded-2xl px-2 py-2 transition-colors",
                        conversation.id === activeConversationId
                          ? "bg-[#eadfce] dark:bg-[#221d18]"
                          : "hover:bg-black/5 dark:hover:bg-white/5"
                      )}
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => onSelectConversation(conversation.id)}
                      >
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{conversation.title}</p>
                          {conversation.pinned ? (
                            <span className="rounded-full bg-[#ddc8af] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6d503b] dark:bg-[#3d3228] dark:text-[#d8c3b1]">
                              fixo
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-xs text-[#7a6756] dark:text-[#a69281]">
                          {conversation.subtitle}
                        </p>
                      </button>

                      <div className="flex items-center gap-1 pl-2">
                        <span className="text-[11px] text-[#8b7765] dark:text-[#a69281]">{conversation.updatedLabel}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100 hover:bg-black/5 dark:hover:bg-white/5"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                           <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => onTogglePinConversation(conversation.id)}>
                              {conversation.pinned ? "Desafixar" : "Favoritar"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openRenameDialog(conversation)}>
                              Mudar o nome
                            </DropdownMenuItem>
                            <DropdownMenuItem>Adicionar ao projecto</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => onDeleteConversation(conversation.id)}
                            >
                              Apagar
                            </DropdownMenuItem>
                           </DropdownMenuContent>
                         </DropdownMenu>
                      </div>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-52">
                    <ConversationActions
                      conversation={conversation}
                      onRename={openRenameDialog}
                      onTogglePin={onTogglePinConversation}
                      onDelete={onDeleteConversation}
                    />
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-inherit p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full items-center rounded-2xl px-2.5 py-2.5 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5",
                collapsed && "justify-center px-0"
              )}
            >
              <Avatar className="h-10 w-10 border border-black/5 dark:border-white/10">
                <AvatarImage src={user.image || undefined} alt={user.name || "Utilizador"} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              {!collapsed ? (
                <div className="ml-3 min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{user.name || "Utilizador"}</p>
                  <p className="truncate text-xs text-[#7a6756] dark:text-[#a69281]">{user.email || "Sem email"}</p>
                </div>
              ) : null}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-64">
            <div className="px-2 py-1.5">
              <p className="truncate text-sm font-medium">{user.name || "Utilizador"}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email || "Sem email"}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/app/settings">Configuracoes</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/app/credits">Upgrade e creditos</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Receber ajuda</DropdownMenuItem>
            <DropdownMenuItem>Obter apps e extensoes</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={renameOpen} onOpenChange={(open) => !open && closeRenameDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renomear conversa</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder="Novo nome da conversa"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitRename();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeRenameDialog}>
              Cancelar
            </Button>
            <Button type="button" onClick={submitRename} disabled={renameDisabled}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
