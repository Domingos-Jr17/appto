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
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea className="flex-1 px-4 py-5 lg:px-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <Card className="border-border/60 bg-background/80 shadow-sm">
            <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Fluxo principal
                </p>
                <h2 className="mt-2 text-lg font-semibold">{project.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getNextActionCopy(project, activeSection)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full">
                  Proxima accao: {chatCost} creditos
                </Badge>
                {project.lastEditedSection ? (
                  <Badge variant="outline" className="rounded-full">
                    Ultima secao: {project.lastEditedSection.title}
                  </Badge>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {chatMessages.length === 0 ? (
            <div className="grid gap-4 lg:grid-cols-3">
              {chatSuggestions.map((suggestion) => (
                <button
                  key={suggestion.label}
                  type="button"
                  onClick={() => {
                    onChatActionChange(suggestion.action as ChatAction);
                    onChatPromptChange(suggestion.prompt);
                  }}
                  className="rounded-[28px] border border-border/60 bg-background/80 p-5 text-left shadow-sm transition-colors hover:bg-muted/35"
                >
                  <p className="text-sm font-semibold text-foreground">{suggestion.label}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {suggestion.prompt}
                  </p>
                </button>
              ))}
            </div>
          ) : null}

          {chatMessages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "rounded-[28px] border px-5 py-4 shadow-sm",
                message.role === "user"
                  ? "ml-auto max-w-3xl border-primary/20 bg-primary/10"
                  : "mr-auto max-w-4xl border-border/60 bg-background/80"
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {message.role === "user" ? "Pedido" : "Resposta"}
                </p>
                <span className="text-xs text-muted-foreground">
                  {message.createdAt.toLocaleTimeString("pt-MZ", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">
                {message.content}
              </div>

              {message.role === "assistant" ? (
                <div className="mt-5 flex flex-wrap gap-2">
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
      </ScrollArea>

      <div className="border-t border-border/50 bg-background/85 px-4 py-4 backdrop-blur lg:px-6">
        <div className="mx-auto max-w-4xl space-y-3">
          <div className="flex flex-wrap gap-2">
            {chatSuggestions.map((suggestion) => (
              <Button
                key={`pill-${suggestion.label}`}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  onChatActionChange(suggestion.action as ChatAction);
                  onChatPromptChange(suggestion.prompt);
                }}
              >
                {suggestion.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <Select value={chatAction} onValueChange={(v) => onChatActionChange(v as ChatAction)}>
              <SelectTrigger className="h-11 rounded-2xl lg:w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brainstorm">Explorar tema</SelectItem>
                <SelectItem value="outline">Gerar outline</SelectItem>
                <SelectItem value="section">Gerar secao</SelectItem>
                <SelectItem value="rewrite">Reformular</SelectItem>
              </SelectContent>
            </Select>

            <Textarea
              value={chatPrompt}
              onChange={(event) => onChatPromptChange(event.target.value)}
              placeholder="Descreva o que precisa da IA neste projecto..."
              className="min-h-[94px] rounded-[24px] border-border/60 bg-background/80 px-4 py-3"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="rounded-full bg-background/80">
                {chatCost} creditos
              </Badge>
              <span>Contexto activo: {sectionTitle || "sem secao"}</span>
            </div>
            <Button
              className="rounded-full px-5"
              onClick={onChatSubmit}
              disabled={!chatPrompt.trim() || isChatLoading}
            >
              {isChatLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Enviar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
