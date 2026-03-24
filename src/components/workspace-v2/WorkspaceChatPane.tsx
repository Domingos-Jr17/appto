"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Bot, PanelLeftOpen, PanelRightOpen, Send, Sparkles, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { AssistantMessage, ChatAction, ChatSuggestion, Project, Section } from "@/types/editor";
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
  onOpenSidebar: () => void;
  onOpenArtifact: () => void;
  onChatPromptChange: (prompt: string) => void;
  onChatActionChange: (action: ChatAction) => void;
  onChatSubmit: () => void;
  onApplyContent: (content: string, action: "insert" | "replace" | "append" | "outline") => void;
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
  onOpenSidebar,
  onOpenArtifact,
  onChatPromptChange,
  onChatActionChange,
  onChatSubmit,
  onApplyContent,
}: WorkspaceChatPaneProps) {
  const chatCost =
    chatAction === "rewrite" ? AI_ACTION_CREDIT_COSTS.improve : AI_ACTION_CREDIT_COSTS.generate;

  const emptySuggestions = useMemo(() => suggestions.slice(0, 3), [suggestions]);

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col bg-[radial-gradient(circle_at_top,#f7efe4_0%,#f4ede3_28%,#f9f5ef_100%)] text-[#2b231c] dark:bg-[radial-gradient(circle_at_top,#261f19_0%,#181411_36%,#151210_100%)] dark:text-[#efe7dd]">
      <div className="border-b border-[#eadfce] bg-white/70 px-4 py-3 backdrop-blur dark:border-[#2d2620] dark:bg-[#161210]/70 lg:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            {sidebarCollapsed ? (
              <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={onOpenSidebar}>
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            ) : null}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold tracking-tight">
                  {activeConversation?.title || project.title}
                </p>
                <Badge variant="outline" className="rounded-full border-[#d6c4af] bg-[#f5ecdf] text-[#6d503b] dark:border-[#4d4034] dark:bg-[#211b16] dark:text-[#d7c3af]">
                  workspace v2
                </Badge>
              </div>
              <p className="truncate text-xs text-[#7a6756] dark:text-[#a69281]">
                {activeSection ? `Secao activa: ${activeSection.title}` : "Conversa principal do projecto"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden rounded-full sm:inline-flex">
              {credits.toLocaleString("pt-MZ")} creditos
            </Badge>
            <Button type="button" variant="outline" asChild className="hidden rounded-full border-[#d8c8b2] bg-white/80 dark:border-[#44372d] dark:bg-[#1e1814] lg:inline-flex">
              <Link href={`/app/projects/${project.id}`}>Editor classico</Link>
            </Button>
            {artifactCollapsed ? (
              <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={onOpenArtifact}>
                <PanelRightOpen className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {chatMessages.length === 0 ? (
            <div className="flex min-h-full flex-1 flex-col items-center justify-center py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-[#df7d45] text-white shadow-lg shadow-[#df7d45]/20">
                <Sparkles className="h-6 w-6" />
              </div>
              <h1 className="mt-6 text-3xl font-semibold tracking-tight lg:text-4xl">Vamos moldar este trabalho.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6b5a4b] dark:text-[#ac9989]">
                Use o chat para estruturar ideias, gerar secoes e transformar respostas em conteudo real no artefacto lateral.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-2.5">
                {emptySuggestions.map((suggestion) => (
                  <button
                    key={suggestion.label}
                    type="button"
                    className="rounded-full border border-[#ddcfbf] bg-white/90 px-4 py-2 text-sm transition-colors hover:bg-[#efe5d8] dark:border-[#41352c] dark:bg-[#1d1814] dark:hover:bg-[#28211c]"
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
                  "max-w-[92%] rounded-[1.75rem] border px-5 py-4 shadow-sm",
                  message.role === "user"
                    ? "ml-auto border-[#e3d1bf] bg-[#f8ece0] dark:border-[#4b3d33] dark:bg-[#231c17]"
                    : "mr-auto border-[#ece2d5] bg-white/85 dark:border-[#302821] dark:bg-[#1a1512]"
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efe3d4] text-[#7a563d] dark:bg-[#2a221c] dark:text-[#dfc3ab]">
                      {message.role === "assistant" ? <Bot className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7b6858] dark:text-[#a69281]">
                      {message.role === "assistant" ? "Assistente" : "Voce"}
                    </span>
                  </div>
                  <span className="text-xs text-[#8b7765] dark:text-[#a69281]">{formatMessageTime(message.createdAt)}</span>
                </div>

                <div className="mt-4 whitespace-pre-wrap text-sm leading-7">{message.content}</div>

                {message.role === "assistant" ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => onApplyContent(message.content, "insert")}>Inserir</Button>
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => onApplyContent(message.content, "replace")}>Substituir</Button>
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => onApplyContent(message.content, "append")}>Nova secao</Button>
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => onApplyContent(message.content, "outline")}>Virar outline</Button>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </div>

      <div className="border-t border-[#eadfce] bg-white/75 px-4 py-4 backdrop-blur dark:border-[#2d2620] dark:bg-[#161210]/75 lg:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-[1.5rem] border border-[#dfd1c3] bg-[#fffdfa] p-3 shadow-sm dark:border-[#342c26] dark:bg-[#1a1512]">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select value={chatAction} onValueChange={(value) => onChatActionChange(value as ChatAction)}>
                  <SelectTrigger className="h-10 rounded-full border-[#decebc] bg-[#fbf5ee] sm:w-[190px] dark:border-[#3c322a] dark:bg-[#211b17]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brainstorm">Explorar tema</SelectItem>
                    <SelectItem value="outline">Gerar outline</SelectItem>
                    <SelectItem value="section">Gerar secao</SelectItem>
                    <SelectItem value="rewrite">Reformular</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex flex-1 gap-2">
                  <Textarea
                    value={chatPrompt}
                    onChange={(event) => onChatPromptChange(event.target.value)}
                    placeholder="Descreva o que quer construir ou analisar..."
                    rows={2}
                    className="min-h-[88px] flex-1 resize-none rounded-[1.25rem] border-[#dfd1c3] bg-transparent px-4 py-3 text-sm shadow-none dark:border-[#342c26]"
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
                    className="h-auto min-h-[88px] w-12 rounded-[1.25rem] bg-[#df7d45] text-white hover:bg-[#c96833]"
                    onClick={onChatSubmit}
                    disabled={!chatPrompt.trim() || isChatLoading}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-[#7a6756] dark:text-[#a69281]">
                <Badge variant="outline" className="rounded-full border-[#d8c3ab] bg-[#f6ecdf] dark:border-[#45382e] dark:bg-[#211b16]">
                  {chatCost} creditos
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
