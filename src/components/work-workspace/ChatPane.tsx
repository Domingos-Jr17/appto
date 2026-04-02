"use client";

import { Bot, Send, Wand2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AssistantMessage } from "@/types/editor";
import type { AIAction } from "@/lib/subscription";

interface QuickAction {
  label: string;
  action: AIAction;
}

interface ChatPaneProps {
  chatMessages: AssistantMessage[];
  chatPrompt: string;
  isChatLoading: boolean;
  generationStatus?: string;
  onChatPromptChange: (prompt: string, action?: AIAction) => void;
  onChatSubmit: () => void;
  onApplyContent: (content: string) => void;
}

export function ChatPane({
  chatMessages,
  chatPrompt,
  isChatLoading,
  generationStatus,
  onChatPromptChange,
  onChatSubmit,
  onApplyContent,
}: ChatPaneProps) {
  const isGenerating = generationStatus === "GENERATING";

  const quickActions: QuickAction[] = isGenerating
    ? [
        { label: "Gerar conteúdo do capítulo actual", action: "generate-section" },
        { label: "Escrever a introdução", action: "generate" },
        { label: "Adicionar referências", action: "references" },
      ]
    : [
        { label: "Melhorar a introdução", action: "improve" },
        { label: "Adicionar referências", action: "references" },
        { label: "Verificar formatação", action: "citations" },
      ];

  const emptyMessage = isGenerating
    ? "O trabalho está a ser gerado. Podes começar a pedir melhorias ou gerar conteúdo adicional enquanto esperas."
    : "Começa a conversar com a IA para gerar, melhorar ou expandir o conteúdo do trabalho.";

  return (
    <section className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background text-foreground">
      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {chatMessages.length === 0 ? (
            <div className="flex min-h-full flex-1 flex-col items-center justify-center py-12 text-center">
              <p className="max-w-md text-sm text-muted-foreground">
                {emptyMessage}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {quickActions.map((qa) => (
                  <Button
                    key={qa.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => onChatPromptChange(qa.label, qa.action)}
                  >
                    {qa.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {chatMessages.map((message) => (
                <motion.article
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className={cn(
                    "max-w-[92%] rounded-2xl border px-5 py-4 shadow-sm",
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
                </motion.article>
              ))}
             </AnimatePresence>
          )}
        </div>
      </div>

      <div className="relative z-10 border-t border-border/60 px-4 py-4 lg:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="glass glass-border rounded-2xl p-3">
            <div className="flex gap-2">
              <Textarea
                value={chatPrompt}
                onChange={(event) => onChatPromptChange(event.target.value)}
                placeholder="Peça para melhorar uma secção, expandir um argumento ou reescrever um trecho..."
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
                aria-label="Enviar mensagem"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
