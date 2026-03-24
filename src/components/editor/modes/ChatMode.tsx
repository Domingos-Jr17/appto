"use client";

import { Loader2, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getNextActionCopy } from "@/lib/editor-helpers";
import { AI_ACTION_CREDIT_COSTS } from "@/lib/credits";
import type { AssistantMessage, ChatAction, ChatSuggestion, Project, Section } from "@/types/editor";

interface ChatModeProps {
  project: Project;
  activeSection: Section | null;
  sectionTitle: string;
  chatMessages: AssistantMessage[];
  chatPrompt: string;
  chatAction: ChatAction;
  isChatLoading: boolean;
  chatSuggestions: ChatSuggestion[];
  onChatPromptChange: (prompt: string) => void;
  onChatActionChange: (action: ChatAction) => void;
  onChatSubmit: () => void;
  onApplyContent: (content: string, action: "insert" | "replace" | "append" | "outline") => void;
}

export function ChatMode({
  project,
  activeSection,
  sectionTitle,
  chatMessages,
  chatPrompt,
  chatAction,
  isChatLoading,
  chatSuggestions,
  onChatPromptChange,
  onChatActionChange,
  onChatSubmit,
  onApplyContent,
}: ChatModeProps) {
  const chatCost =
    chatAction === "rewrite" ? AI_ACTION_CREDIT_COSTS.improve : AI_ACTION_CREDIT_COSTS.generate;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Scrollable messages area */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="mx-auto flex max-w-3xl flex-col px-4 py-6 lg:px-6">
          {chatMessages.length === 0 ? (
            /* Empty state - greet like ChatGPT */
            <div className="mb-8 flex flex-col items-center justify-center">
              <h2 className="text-2xl font-semibold tracking-tight lg:text-3xl">
                Como posso ajudar?
              </h2>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                {getNextActionCopy(project, activeSection)}
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {chatSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.label}
                    type="button"
                    onClick={() => {
                      onChatActionChange(suggestion.action as ChatAction);
                      onChatPromptChange(suggestion.prompt);
                    }}
                    className="rounded-full border border-border/60 bg-muted/30 px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted/50"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages thread */
            <div className="flex flex-col gap-4 pb-6">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "rounded-2xl px-4 py-3",
                    message.role === "user"
                      ? "ml-auto max-w-[85%] bg-primary/10 text-foreground"
                      : "mr-auto max-w-[95%] bg-muted/30 text-foreground"
                  )}
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      {message.role === "user" ? "Voce" : "aptto"}
                    </p>
                    <span className="text-[11px] text-muted-foreground">
                      {message.createdAt.toLocaleTimeString("pt-MZ", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm leading-7">
                    {message.content}
                  </div>

                  {message.role === "assistant" ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => onApplyContent(message.content, "insert")}
                      >
                        Inserir na secao
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => onApplyContent(message.content, "replace")}
                      >
                        Substituir secao
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => onApplyContent(message.content, "append")}
                      >
                        Nova secao
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => onApplyContent(message.content, "outline")}
                      >
                        Virar outline
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Sticky composer at bottom - fixed height */}
      <div className="shrink-0 border-t border-border/50 bg-background/90 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3 lg:px-6">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={chatAction} onValueChange={(v) => onChatActionChange(v as ChatAction)}>
                <SelectTrigger className="h-10 rounded-full sm:w-[180px]">
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
                  placeholder="O que precisa da IA?"
                  rows={1}
                  className="min-h-[40px] flex-1 resize-none rounded-2xl border-border/60 bg-background/80 px-4 py-2.5 text-sm"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      onChatSubmit();
                    }
                  }}
                />

                <Button
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full"
                  onClick={onChatSubmit}
                  disabled={!chatPrompt.trim() || isChatLoading}
                >
                  {isChatLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Badge variant="outline" className="rounded-full text-[10px]">
                {chatCost} creditos
              </Badge>
              <span>Contexto: {sectionTitle || "sem secao"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
