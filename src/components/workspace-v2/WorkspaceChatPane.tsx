"use client";

import { useMemo } from "react";
import { Bot, Download, FileDown, Loader2, PanelLeftOpen, PanelRightOpen, Send, Sparkles, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AI_ACTION_CREDIT_COSTS } from "@/lib/credits";
import type {
  AssistantMessage,
  ChatAction,
  ChatSuggestion,
  Project,
  Section,
} from "@/types/editor";
import type { WorkspaceConversationItem } from "./workspace-types";

interface WorkspaceChatPaneProps {
  project: Project;
  activeSection: Section | null;
  activeConversation: WorkspaceConversationItem | null;
  chatMessages: AssistantMessage[];
  chatPrompt: string;
  chatAction: ChatAction;
  isChatLoading: boolean;
  suggestions: ChatSuggestion[];
  credits: number;
  sidebarCollapsed: boolean;
  artifactCollapsed: boolean;
  isSavingExport: "docx" | "pdf" | null;
  onOpenSidebar: () => void;
  onOpenArtifact: () => void;
  onChatPromptChange: (prompt: string) => void;
  onChatActionChange: (action: ChatAction) => void;
  onChatSubmit: () => void;
  onApplyContent: (content: string, action: "insert" | "replace" | "append" | "outline") => void;
  onExport: (format: "docx" | "pdf") => void;
  onSaveExport: (format: "docx" | "pdf") => void;
}

function formatMessageTime(value: Date) {
  return value.toLocaleTimeString("pt-MZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WorkspaceChatPane({
  project,
  activeSection,
  activeConversation,
  chatMessages,
  chatPrompt,
  chatAction,
  isChatLoading,
  suggestions,
  credits,
  sidebarCollapsed,
  artifactCollapsed,
  isSavingExport,
  onOpenSidebar,
  onOpenArtifact,
  onChatPromptChange,
  onChatActionChange,
  onChatSubmit,
  onApplyContent,
  onExport,
  onSaveExport,
}: WorkspaceChatPaneProps) {
  const chatCost =
    chatAction === "rewrite" ? AI_ACTION_CREDIT_COSTS.improve : AI_ACTION_CREDIT_COSTS.generate;

  const emptySuggestions = useMemo(() => suggestions.slice(0, 3), [suggestions]);

  return (
    <section className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 grid-pattern-subtle opacity-60" />

      <div className="app-shell-header relative z-10 border-b border-border/60 px-4 py-3 lg:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            {sidebarCollapsed ? (
              <Button type="button" variant="ghost" size="icon" className="focus-ring rounded-full" onClick={onOpenSidebar}>
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            ) : null}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold tracking-tight">{project.title}</p>
                <Badge variant="outline" className="rounded-full">
                  Assistente
                </Badge>
              </div>
                <p className="truncate text-xs text-muted-foreground">
                  {activeSection
                    ? `Secção activa: ${activeSection.title}`
                    : activeConversation?.title || "Orientação académica do projecto"}
                </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden rounded-full sm:inline-flex">
              {credits.toLocaleString("pt-MZ")} créditos
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full">
                  {isSavingExport ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="mr-1 h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">Exportar</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => onExport("docx")}>
                  <Download className="mr-2 h-4 w-4" />
                  Descarregar DOCX
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport("pdf")}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Descarregar PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSaveExport("docx")}>
                  <Download className="mr-2 h-4 w-4" />
                  Guardar DOCX
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSaveExport("pdf")}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Guardar PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {artifactCollapsed ? (
              <Button type="button" variant="ghost" size="icon" className="focus-ring rounded-full" onClick={onOpenArtifact}>
                <PanelRightOpen className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {chatMessages.length === 0 ? (
            <div className="flex min-h-full flex-1 flex-col items-center justify-center py-12 text-center">
              <div className="gradient-primary gradient-glow flex h-14 w-14 items-center justify-center rounded-[1.4rem] text-primary-foreground shadow-lg">
                <Sparkles className="h-6 w-6" />
              </div>
              <h1 className="mt-6 text-3xl font-semibold tracking-tight lg:text-4xl">
                O teu assistente para construir o trabalho.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                Peça ajuda para estruturar capítulos, rever argumentos, abrir novas secções e transformar ideias num documento académico real.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-2.5">
                {emptySuggestions.map((suggestion) => (
                  <button
                    key={suggestion.label}
                    type="button"
                    className="card-hover rounded-full border border-border/60 bg-card px-4 py-2 text-sm transition-colors hover:bg-accent"
                    onClick={() => {
                      onChatActionChange(suggestion.action as ChatAction);
                      onChatPromptChange(suggestion.prompt);
                    }}
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            chatMessages.map((message) => (
              <article
                key={message.id}
                className={cn(
                  "max-w-[92%] rounded-3xl border px-5 py-4 shadow-sm transition-colors",
                  message.role === "user"
                    ? "ml-auto border-primary/20 bg-primary/10"
                    : "mr-auto glass glass-border bg-card/90"
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {message.role === "assistant" ? <Bot className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {message.role === "assistant" ? "Assistente" : "Você"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatMessageTime(message.createdAt)}</span>
                </div>

                <div className="mt-4 whitespace-pre-wrap text-sm leading-7">{message.content}</div>

                {message.role === "assistant" ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => onApplyContent(message.content, "insert")}>
                      Aplicar ao documento
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => onApplyContent(message.content, "replace")}>
                      Substituir secção
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => onApplyContent(message.content, "append")}>
                      Criar nova secção
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => onApplyContent(message.content, "outline")}>
                      Transformar em estrutura
                    </Button>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </div>

      <div className="app-shell-header relative z-10 border-t border-border/60 px-4 py-4 lg:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="glass glass-border rounded-3xl p-3 shadow-sm">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select value={chatAction} onValueChange={(value) => onChatActionChange(value as ChatAction)}>
                  <SelectTrigger className="h-10 rounded-full border-border/70 bg-background/70 sm:w-[210px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brainstorm">Explorar tema</SelectItem>
                    <SelectItem value="outline">Gerar estrutura</SelectItem>
                    <SelectItem value="section">Escrever secção</SelectItem>
                    <SelectItem value="rewrite">Reformular argumento</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex flex-1 gap-2">
                  <Textarea
                    value={chatPrompt}
                    onChange={(event) => onChatPromptChange(event.target.value)}
                    placeholder="Peça ajuda para orientar o trabalho, melhorar a secção activa ou planear a próxima parte..."
                    rows={2}
                    className="min-h-[88px] flex-1 resize-none rounded-2xl border-border/70 bg-background/40 px-4 py-3 text-sm shadow-none"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        onChatSubmit();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    className="gradient-primary h-auto min-h-[88px] w-12 rounded-2xl text-primary-foreground hover:opacity-90"
                    onClick={onChatSubmit}
                    disabled={!chatPrompt.trim() || isChatLoading}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="rounded-full">
                  {chatCost} créditos
                </Badge>
                <span>Contexto: {activeSection?.title || "projecto completo"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
