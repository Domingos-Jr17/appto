"use client";

import { Bot, Download, Loader2, Send, Sparkles, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AI_ACTION_CREDIT_COSTS } from "@/lib/credits";
import type { AssistantMessage, Section } from "@/types/editor";

interface ChatPaneProps {
  activeSection: Section | null;
  chatMessages: AssistantMessage[];
  chatPrompt: string;
  isChatLoading: boolean;
  isSavingExport: "docx" | "pdf" | null;
  onChatPromptChange: (prompt: string) => void;
  onChatSubmit: () => void;
  onApplyContent: (content: string) => void;
  onExport: (format: "docx") => void;
}

export function ChatPane({
  activeSection,
  chatMessages,
  chatPrompt,
  isChatLoading,
  isSavingExport,
  onChatPromptChange,
  onChatSubmit,
  onApplyContent,
  onExport,
}: ChatPaneProps) {
  return (
    <section className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 grid-pattern-subtle opacity-60" />

      <div className="app-shell-header relative z-10 border-b border-border/60 px-4 py-3 lg:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">
              {activeSection ? activeSection.title : "Assistente"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => onExport("docx")}
            disabled={isSavingExport !== null}
          >
            {isSavingExport ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="mr-1 h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Exportar DOCX</span>
          </Button>
        </div>
      </div>

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {chatMessages.length === 0 ? (
            <div className="flex min-h-full flex-1 flex-col items-center justify-center py-12 text-center">
              <div className="gradient-primary gradient-glow flex h-14 w-14 items-center justify-center rounded-[1.4rem] text-primary-foreground shadow-lg">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="mt-6 text-2xl font-semibold tracking-tight lg:text-3xl">
                O teu assistente académico.
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-7 text-muted-foreground">
                Escreva o que precisa — estruturar, escrever, rever ou expandir — e o assistente responde com conteúdo pronto a aplicar.
              </p>
            </div>
          ) : (
            chatMessages.map((message) => (
              <article
                key={message.id}
                className={cn(
                  "max-w-[92%] rounded-xl border px-5 py-4 shadow-sm transition-colors",
                  message.role === "user"
                    ? "ml-auto border-primary/20 bg-primary/10"
                    : "mr-auto glass glass-border bg-card/90"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {message.role === "assistant" ? <Bot className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {message.role === "assistant" ? "Assistente" : "Você"}
                  </span>
                </div>

                <div className="mt-4 whitespace-pre-wrap text-sm leading-7">{message.content}</div>

                {message.role === "assistant" ? (
                  <div className="mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => onApplyContent(message.content)}
                    >
                      Aplicar ao documento
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
          <div className="glass glass-border rounded-xl p-3 shadow-sm">
            <div className="flex gap-2">
              <Textarea
                value={chatPrompt}
                onChange={(event) => onChatPromptChange(event.target.value)}
                placeholder="Peça ajuda para estruturar, escrever ou rever..."
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
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="rounded-full">
                {AI_ACTION_CREDIT_COSTS.generate} créditos
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
