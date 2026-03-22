"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Send,
  Wand2,
  FileText,
  BookOpen,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap,
  Copy,
  Quote,
} from "lucide-react";
import { AI_ACTION_CREDIT_COSTS } from "@/lib/credits";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIAssistantPanelProps {
  onGenerate?: (prompt: string) => Promise<string>;
  onImprove?: (text: string, type: string) => Promise<string>;
  onGenerateReference?: (data: ReferenceData) => Promise<string>;
  creditBalance: number;
}

interface ReferenceData {
  type: "book" | "article" | "website" | "thesis";
  authors: string;
  title: string;
  year: string;
  publisher?: string;
  journal?: string;
  volume?: string;
  pages?: string;
  url?: string;
  accessDate?: string;
}

export function AIAssistantPanel({
  onGenerate,
  onImprove,
  onGenerateReference,
  creditBalance,
}: AIAssistantPanelProps) {
  const [activeTab, setActiveTab] = useState("generate");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedText, setSelectedText] = useState("");
  const [improveType, setImproveType] = useState("coherence");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reference form state
  const [refType, setRefType] = useState<ReferenceData["type"]>("book");
  const [refAuthors, setRefAuthors] = useState("");
  const [refTitle, setRefTitle] = useState("");
  const [refYear, setRefYear] = useState("");
  const [refPublisher, setRefPublisher] = useState("");
  const [refJournal, setRefJournal] = useState("");
  const [refVolume, setRefVolume] = useState("");
  const [refPages, setRefPages] = useState("");
  const [refUrl, setRefUrl] = useState("");
  const [refAccessDate, setRefAccessDate] = useState("");
  const [generatedReference, setGeneratedReference] = useState("");

  const creditCosts = {
    generate: AI_ACTION_CREDIT_COSTS.generate,
    improve: AI_ACTION_CREDIT_COSTS.improve,
    reference: AI_ACTION_CREDIT_COSTS.references,
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    if (creditBalance < creditCosts.generate) {
      return;
    }

    setIsGenerating(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: prompt,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await onGenerate?.(prompt);
      if (response) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Generation error:", error);
    } finally {
      setIsGenerating(false);
      setPrompt("");
    }
  };

  const handleImprove = async () => {
    if (!selectedText.trim() || isGenerating) return;
    if (creditBalance < creditCosts.improve) return;

    setIsGenerating(true);
    try {
      await onImprove?.(selectedText, improveType);
    } catch (error) {
      console.error("Improve error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateReference = async () => {
    if (!refAuthors || !refTitle || !refYear || isGenerating) return;
    if (creditBalance < creditCosts.reference) return;

    setIsGenerating(true);
    try {
      const refData: ReferenceData = {
        type: refType,
        authors: refAuthors,
        title: refTitle,
        year: refYear,
        publisher: refPublisher,
        journal: refJournal,
        volume: refVolume,
        pages: refPages,
        url: refUrl,
        accessDate: refAccessDate,
      };
      const reference = await onGenerateReference?.(refData);
      if (reference) {
        setGeneratedReference(reference);
      }
    } catch (error) {
      console.error("Reference generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/20 glow-primary">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Assistente IA</h3>
            <p className="text-xs text-muted-foreground">
              {creditBalance} créditos disponíveis
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        <TabsList className="w-full grid grid-cols-3 m-2 mb-0 bg-muted/50">
          <TabsTrigger value="generate" className="text-xs gap-1">
            <Zap className="h-3 w-3" />
            <span className="hidden sm:inline">Gerar</span>
          </TabsTrigger>
          <TabsTrigger value="improve" className="text-xs gap-1">
            <Wand2 className="h-3 w-3" />
            <span className="hidden sm:inline">Melhorar</span>
          </TabsTrigger>
          <TabsTrigger value="references" className="text-xs gap-1">
            <BookOpen className="h-3 w-3" />
            <span className="hidden sm:inline">Referências</span>
          </TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="generate" className="flex-1 flex flex-col mt-0">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4 scrollbar-thin">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm">
                  Digite um prompt para gerar conteúdo acadêmico
                </p>
                <p className="text-xs mt-1 opacity-70">
                  Custo: {creditCosts.generate} créditos
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "p-3 rounded-lg text-sm",
                      message.role === "user"
                        ? "bg-primary/10 border border-primary/20 ml-4"
                        : "bg-muted/50 mr-4"
                    )}
                  >
                    {message.content}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-border/50 space-y-3">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Descreva o conteúdo que deseja gerar..."
              className="min-h-[80px] resize-none bg-muted/30 border-border/50 focus:border-primary/50"
              disabled={isGenerating}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Zap className="h-3 w-3 text-yellow-500" />
                {creditCosts.generate} créditos
              </span>
              <Button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating || creditBalance < creditCosts.generate}
                size="sm"
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Gerar
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Improve Tab */}
        <TabsContent value="improve" className="flex-1 flex flex-col mt-0 p-4 space-y-4">
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">
              Tipo de melhoria
            </Label>
            <Select value={improveType} onValueChange={setImproveType}>
              <SelectTrigger className="bg-muted/30 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="coherence">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Melhorar Coerência
                  </div>
                </SelectItem>
                <SelectItem value="grammar">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    Corrigir Gramática
                  </div>
                </SelectItem>
                <SelectItem value="academic">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    Tom Acadêmico
                  </div>
                </SelectItem>
                <SelectItem value="clarity">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    Melhorar Clareza
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">
              Texto selecionado
            </Label>
            <Textarea
              value={selectedText}
              onChange={(e) => setSelectedText(e.target.value)}
              placeholder="Cole ou digite o texto que deseja melhorar..."
              className="min-h-[120px] resize-none bg-muted/30 border-border/50"
              disabled={isGenerating}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Zap className="h-3 w-3 text-yellow-500" />
              {creditCosts.improve} créditos
            </span>
            <Button
              onClick={handleImprove}
              disabled={!selectedText.trim() || isGenerating || creditBalance < creditCosts.improve}
              size="sm"
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Melhorar
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* References Tab */}
        <TabsContent value="references" className="flex-1 flex flex-col mt-0 p-4 space-y-4 overflow-y-auto scrollbar-thin">
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">
              Tipo de referência
            </Label>
            <Select value={refType} onValueChange={(v) => setRefType(v as ReferenceData["type"])}>
              <SelectTrigger className="bg-muted/30 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="book">Livro</SelectItem>
                <SelectItem value="article">Artigo Científico</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="thesis">Tese/Dissertação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Autores *</Label>
              <Input
                value={refAuthors}
                onChange={(e) => setRefAuthors(e.target.value)}
                placeholder="SOBRENOME, Nome"
                className="bg-muted/30 border-border/50 h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Título *</Label>
              <Input
                value={refTitle}
                onChange={(e) => setRefTitle(e.target.value)}
                placeholder="Título da obra"
                className="bg-muted/30 border-border/50 h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Ano *</Label>
                <Input
                  value={refYear}
                  onChange={(e) => setRefYear(e.target.value)}
                  placeholder="2024"
                  className="bg-muted/30 border-border/50 h-9"
                />
              </div>

              {(refType === "book" || refType === "thesis") && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Editora</Label>
                  <Input
                    value={refPublisher}
                    onChange={(e) => setRefPublisher(e.target.value)}
                    placeholder="Editora"
                    className="bg-muted/30 border-border/50 h-9"
                  />
                </div>
              )}
            </div>

            {refType === "article" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Periódico</Label>
                  <Input
                    value={refJournal}
                    onChange={(e) => setRefJournal(e.target.value)}
                    placeholder="Nome do periódico"
                    className="bg-muted/30 border-border/50 h-9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Volume</Label>
                    <Input
                      value={refVolume}
                      onChange={(e) => setRefVolume(e.target.value)}
                      placeholder="v. 1"
                      className="bg-muted/30 border-border/50 h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Páginas</Label>
                    <Input
                      value={refPages}
                      onChange={(e) => setRefPages(e.target.value)}
                      placeholder="p. 1-10"
                      className="bg-muted/30 border-border/50 h-9"
                    />
                  </div>
                </div>
              </>
            )}

            {refType === "website" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">URL</Label>
                  <Input
                    value={refUrl}
                    onChange={(e) => setRefUrl(e.target.value)}
                    placeholder="https://..."
                    className="bg-muted/30 border-border/50 h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Data de Acesso</Label>
                  <Input
                    value={refAccessDate}
                    onChange={(e) => setRefAccessDate(e.target.value)}
                    placeholder="DD MMA AAAA"
                    className="bg-muted/30 border-border/50 h-9"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Zap className="h-3 w-3 text-yellow-500" />
              {creditCosts.reference} crédito
            </span>
            <Button
              onClick={handleGenerateReference}
              disabled={!refAuthors || !refTitle || !refYear || isGenerating || creditBalance < creditCosts.reference}
              size="sm"
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Quote className="h-4 w-4" />
                  Gerar ABNT
                </>
              )}
            </Button>
          </div>

          {/* Generated Reference */}
          {generatedReference && (
            <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm">{generatedReference}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 flex-shrink-0"
                  onClick={() => copyToClipboard(generatedReference)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
