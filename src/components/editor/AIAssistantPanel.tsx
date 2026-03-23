"use client";

import { useState } from "react";
import { BookOpen, Copy, Loader2, Quote, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AI_ACTION_CREDIT_COSTS } from "@/lib/credits";

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

interface AIAssistantPanelProps {
  projectTitle: string;
  sectionTitle: string;
  sectionContent: string;
  onImprove?: (text: string, type: string) => Promise<string>;
  onGenerateReference?: (data: ReferenceData) => Promise<string>;
  onApplyReplace?: (content: string) => void;
  onApplyAppend?: (content: string) => void;
  creditBalance: number;
}

const ACTION_OPTIONS = [
  {
    id: "expand_argument",
    label: "Expandir argumento",
    helper: "Aprofunda a secção com mais desenvolvimento lógico.",
  },
  {
    id: "summarize_section",
    label: "Resumir",
    helper: "Condensa a secção mantendo a ideia central.",
  },
  {
    id: "clarify_section",
    label: "Clarificar",
    helper: "Torna a escrita mais clara e directa.",
  },
  {
    id: "academic_tone",
    label: "Tom académico",
    helper: "Reforça formalidade, coesão e linguagem académica.",
  },
] as const;

export function AIAssistantPanel({
  projectTitle,
  sectionTitle,
  sectionContent,
  onImprove,
  onGenerateReference,
  onApplyReplace,
  onApplyAppend,
  creditBalance,
}: AIAssistantPanelProps) {
  const [activeTab, setActiveTab] = useState("actions");
  const [actionId, setActionId] = useState<(typeof ACTION_OPTIONS)[number]["id"]>("expand_argument");
  const [instruction, setInstruction] = useState("");
  const [result, setResult] = useState("");
  const [isRunning, setIsRunning] = useState(false);

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

  const activeAction = ACTION_OPTIONS.find((option) => option.id === actionId) ?? ACTION_OPTIONS[0];

  const handleRunAction = async () => {
    if (!sectionContent.trim() || isRunning) return;
    if (creditBalance < AI_ACTION_CREDIT_COSTS.improve) return;

    setIsRunning(true);
    try {
      const context = `${activeAction.label} para a secção "${sectionTitle}" do projecto "${projectTitle}". ${
        instruction ? `Instrução adicional: ${instruction}` : ""
      }`.trim();
      const improved = await onImprove?.(sectionContent, context);
      setResult(improved || "");
    } finally {
      setIsRunning(false);
    }
  };

  const handleGenerateReference = async () => {
    if (!refAuthors || !refTitle || !refYear || isRunning) return;
    if (creditBalance < AI_ACTION_CREDIT_COSTS.references) return;

    setIsRunning(true);
    try {
      const reference = await onGenerateReference?.({
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
      });
      setGeneratedReference(reference || "");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/50 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-primary/10 p-2.5">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Apoio editorial</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              IA táctica para a secção activa. O modo conversa continua no centro do workspace.
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-3 mt-3 grid grid-cols-2 rounded-2xl bg-muted/40">
          <TabsTrigger value="actions" className="rounded-xl text-xs">
            <Wand2 className="mr-2 h-3.5 w-3.5" />
            Ações
          </TabsTrigger>
          <TabsTrigger value="references" className="rounded-xl text-xs">
            <BookOpen className="mr-2 h-3.5 w-3.5" />
            Referências
          </TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="mt-0 flex min-h-0 flex-1 flex-col">
          <ScrollArea className="flex-1 px-4 py-4">
            <div className="space-y-4">
              <div className="rounded-3xl border border-border/60 bg-muted/25 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Secção activa</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{sectionTitle || "Sem secção seleccionada"}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {activeAction.helper}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Acção contextual</Label>
                <Select value={actionId} onValueChange={(value) => setActionId(value as typeof actionId)}>
                  <SelectTrigger className="rounded-2xl border-border/60 bg-background/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Instrução adicional</Label>
                <Textarea
                  value={instruction}
                  onChange={(event) => setInstruction(event.target.value)}
                  placeholder="Opcional: indique o ângulo, a profundidade ou o foco da melhoria."
                  className="min-h-[92px] rounded-2xl border-border/60 bg-background/80"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Base da secção</Label>
                <Textarea
                  value={sectionContent}
                  readOnly
                  className="min-h-[180px] rounded-2xl border-border/60 bg-muted/20 text-sm leading-6 text-muted-foreground"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {AI_ACTION_CREDIT_COSTS.improve} créditos por iteração
                </p>
                <Button
                  onClick={() => void handleRunAction()}
                  disabled={!sectionContent.trim() || isRunning || creditBalance < AI_ACTION_CREDIT_COSTS.improve}
                  className="rounded-full"
                >
                  {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  Executar
                </Button>
              </div>

              {result ? (
                <div className="space-y-3 rounded-3xl border border-border/60 bg-background/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">Resultado</p>
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => void navigator.clipboard.writeText(result)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">{result}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => onApplyReplace?.(result)}>
                      Substituir secção
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => onApplyAppend?.(result)}>
                      Adicionar ao final
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="references" className="mt-0 flex min-h-0 flex-1 flex-col">
          <ScrollArea className="flex-1 px-4 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Tipo de referência</Label>
                <Select value={refType} onValueChange={(value) => setRefType(value as ReferenceData["type"])}>
                  <SelectTrigger className="rounded-2xl border-border/60 bg-background/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="book">Livro</SelectItem>
                    <SelectItem value="article">Artigo científico</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="thesis">Tese/Dissertação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Autores *</Label>
                  <Input value={refAuthors} onChange={(event) => setRefAuthors(event.target.value)} className="h-10 rounded-2xl border-border/60 bg-background/80" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Título *</Label>
                  <Input value={refTitle} onChange={(event) => setRefTitle(event.target.value)} className="h-10 rounded-2xl border-border/60 bg-background/80" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ano *</Label>
                    <Input value={refYear} onChange={(event) => setRefYear(event.target.value)} className="h-10 rounded-2xl border-border/60 bg-background/80" />
                  </div>
                  {(refType === "book" || refType === "thesis") ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Editora</Label>
                      <Input value={refPublisher} onChange={(event) => setRefPublisher(event.target.value)} className="h-10 rounded-2xl border-border/60 bg-background/80" />
                    </div>
                  ) : null}
                </div>

                {refType === "article" ? (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Periódico</Label>
                      <Input value={refJournal} onChange={(event) => setRefJournal(event.target.value)} className="h-10 rounded-2xl border-border/60 bg-background/80" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Volume</Label>
                        <Input value={refVolume} onChange={(event) => setRefVolume(event.target.value)} className="h-10 rounded-2xl border-border/60 bg-background/80" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Páginas</Label>
                        <Input value={refPages} onChange={(event) => setRefPages(event.target.value)} className="h-10 rounded-2xl border-border/60 bg-background/80" />
                      </div>
                    </div>
                  </>
                ) : null}

                {refType === "website" ? (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">URL</Label>
                      <Input value={refUrl} onChange={(event) => setRefUrl(event.target.value)} className="h-10 rounded-2xl border-border/60 bg-background/80" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Data de acesso</Label>
                      <Input value={refAccessDate} onChange={(event) => setRefAccessDate(event.target.value)} className="h-10 rounded-2xl border-border/60 bg-background/80" />
                    </div>
                  </>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {AI_ACTION_CREDIT_COSTS.references} crédito por referência
                </p>
                <Button
                  onClick={() => void handleGenerateReference()}
                  disabled={!refAuthors || !refTitle || !refYear || isRunning || creditBalance < AI_ACTION_CREDIT_COSTS.references}
                  className="rounded-full"
                >
                  {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Quote className="mr-2 h-4 w-4" />}
                  Gerar ABNT
                </Button>
              </div>

              {generatedReference ? (
                <div className="rounded-3xl border border-border/60 bg-background/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">Referência gerada</p>
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => void navigator.clipboard.writeText(generatedReference)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-foreground">{generatedReference}</p>
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
