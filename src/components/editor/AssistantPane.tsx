"use client";

import { Loader2, Send } from "lucide-react";
import { AIAssistantPanel } from "@/components/editor/AIAssistantPanel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AI_ACTION_CREDIT_COSTS } from "@/lib/credits";
import type {
  AssistantMessage,
  ChatAction,
  ChatSuggestion,
  ReferenceData,
  Section,
} from "@/types/editor";

interface AssistantPaneProps {
  projectTitle: string;
  activeSection: Section | null;
  sectionTitle: string;
  content: string;
  credits: number;
  chatMessages: AssistantMessage[];
  chatPrompt: string;
  chatAction: ChatAction;
  isChatLoading: boolean;
  chatSuggestions: ChatSuggestion[];
  onChatPromptChange: (prompt: string) => void;
  onChatActionChange: (action: ChatAction) => void;
  onChatSubmit: () => void;
  onApplyContent: (content: string, action: "insert" | "replace" | "append" | "outline") => void;
  onImprove: (text: string, type: string) => Promise<string>;
  onGenerateReference: (data: ReferenceData) => Promise<string>;
  onReplaceContent: (content: string) => void;
  onAppendContent: (content: string) => void;
}

export function AssistantPane({
  projectTitle,
  activeSection,
  sectionTitle,
  content,
  credits,
  chatMessages,
  chatPrompt,
  chatAction,
  isChatLoading,
  chatSuggestions,
  onChatPromptChange,
  onChatActionChange,
  onChatSubmit,
  onApplyContent,
  onImprove,
  onGenerateReference,
  onReplaceContent,
  onAppendContent,
}: AssistantPaneProps) {
  const chatCost =
    chatAction === "rewrite" ? AI_ACTION_CREDIT_COSTS.improve : AI_ACTION_CREDIT_COSTS.generate;

  return (
    <div className="flex h-full w-[320px] min-w-[280px] flex-col border-r border-border/50 bg-background/65 backdrop-blur">
      <Tabs defaultValue="orientacao" className="flex h-full flex-col">
        <div className="border-b border-border/50 px-3 py-2">
          <TabsList className="grid w-full grid-cols-2 rounded-2xl">
            <TabsTrigger value="orientacao" className="rounded-xl text-xs">
              Orientacao
            </TabsTrigger>
            <TabsTrigger value="accoes" className="rounded-xl text-xs">
              Accoes
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab: Orientacao (chat + sugestoes) */}
        <TabsContent value="orientacao" className="flex min-h-0 flex-1 flex-col mt-0">
          {/* Secção ativa info */}
          <div className="border-b border-border/50 px-3 py-2">
            <div className="rounded-2xl border border-border/40 bg-muted/20 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Seccao activa
              </p>
              <p className="mt-1 text-xs font-semibold text-foreground">
                {activeSection?.title || "Sem secao"}
              </p>
            </div>
          </div>

          {/* Sugestoes rapidas */}
          <div className="border-b border-border/50 px-3 py-2">
            <div className="flex flex-wrap gap-1.5">
              {chatSuggestions.map((suggestion) => (
                <button
                  key={suggestion.label}
                  type="button"
                  onClick={() => {
                    onChatActionChange(suggestion.action as ChatAction);
                    onChatPromptChange(suggestion.prompt);
                  }}
                  className="rounded-full border border-border/40 bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chat messages */}
          <ScrollArea className="flex-1 px-3 py-3">
            <div className="flex flex-col gap-3">
              {chatMessages.length === 0 ? (
                <div className="px-2 py-6 text-center">
                  <p className="text-xs text-muted-foreground">
                    Use as sugestoes acima ou escreva um pedido para comecar.
                  </p>
                </div>
              ) : null}

              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "rounded-2xl border px-3 py-2.5 text-xs",
                    message.role === "user"
                      ? "ml-auto max-w-[85%] border-primary/20 bg-primary/5"
                      : "mr-auto max-w-[90%] border-border/40 bg-muted/20"
                  )}
                >
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {message.role === "user" ? "Pedido" : "Resposta"}
                  </p>
                  <div className="whitespace-pre-wrap leading-relaxed text-foreground">
                    {message.content}
                  </div>

                  {message.role === "assistant" ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 rounded-full px-2 text-[10px]"
                        onClick={() => onApplyContent(message.content, "insert")}
                      >
                        Inserir
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 rounded-full px-2 text-[10px]"
                        onClick={() => onApplyContent(message.content, "replace")}
                      >
                        Substituir
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 rounded-full px-2 text-[10px]"
                        onClick={() => onApplyContent(message.content, "append")}
                      >
                        Nova secao
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 rounded-full px-2 text-[10px]"
                        onClick={() => onApplyContent(message.content, "outline")}
                      >
                        Outline
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Prompt input */}
          <div className="border-t border-border/50 p-3">
            <div className="space-y-2">
              <Textarea
                value={chatPrompt}
                onChange={(e) => onChatPromptChange(e.target.value)}
                placeholder="Escreva o seu pedido..."
                className="min-h-[72px] rounded-2xl border-border/40 bg-background/80 px-3 py-2 text-xs"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  {chatCost} creditos
                </span>
                <Button
                  size="sm"
                  className="h-8 rounded-full px-4 text-xs"
                  onClick={onChatSubmit}
                  disabled={!chatPrompt.trim() || isChatLoading}
                >
                  {isChatLoading ? (
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="mr-1.5 h-3 w-3" />
                  )}
                  Enviar
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Acoes (AIAssistantPanel existente) */}
        <TabsContent value="accoes" className="min-h-0 flex-1 mt-0 overflow-hidden">
          <AIAssistantPanel
            projectTitle={projectTitle}
            sectionTitle={activeSection?.title || sectionTitle || "Sem secao"}
            sectionContent={activeSection?.content || content}
            onImprove={onImprove}
            onGenerateReference={onGenerateReference}
            onApplyReplace={onReplaceContent}
            onApplyAppend={onAppendContent}
            creditBalance={credits}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
