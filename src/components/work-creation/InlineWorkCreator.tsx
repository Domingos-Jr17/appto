"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { ChevronDown, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatRelativeTime } from "@/lib/utils";
import { getTemplateLabel } from "@/lib/cover-template-config";
import { GenerateWorkProgress } from "@/components/work-creation/GenerateWorkProgress";
import { EducationFields } from "@/components/work-creation/EducationFields";
import {
  useWorkCreation,
  GENERATION_STEPS,
} from "@/hooks/use-work-creation";
import type { AcademicEducationLevel } from "@/types/editor";
import { useAppShellData } from "@/components/app-shell/AppShellDataContext";

// ── Constants ─────────────────────────────────────────────────────────

type CreatorState = "EMPTY" | "FILLING" | "GENERATING";

const EDUCATION_LEVELS: {
  value: AcademicEducationLevel;
  label: string;
  icon: string;
}[] = [
  { value: "SECONDARY", label: "Secundário", icon: "📚" },
  { value: "TECHNICAL", label: "Técnico", icon: "🔧" },
  { value: "HIGHER_EDUCATION", label: "Superior", icon: "🎓" },
];

// ── Component ─────────────────────────────────────────────────────────

export function InlineWorkCreator() {
  const { data: session } = useSession();
  const { projects } = useAppShellData();
  const searchParams = useSearchParams();

  const {
    workForm,
    updateWorkForm,
    handleEducationLevelChange,
    handleInstitutionChange,
    resetWorkForm,
    createWork,
    isCreating,
    generationStep,
    generationProjectId,
    subscriptionStatus,
  } = useWorkCreation();

  const [state, setState] = useState<CreatorState>("EMPTY");

  const firstName = session?.user?.name?.split(" ")[0] || "Estudante";
  const recentProjects = projects.slice(0, 3);

  const prevSearchRef = useRef<string | null>(null);

  // Handle ?new=1 → reset form to EMPTY
  useEffect(() => {
    const current = searchParams.get("new");
    if (prevSearchRef.current !== current && current === "1") {
      prevSearchRef.current = current;
      resetWorkForm();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState("EMPTY");
    } else {
      prevSearchRef.current = current;
    }
  }, [searchParams, resetWorkForm]);

  const handleContinue = () => {
    if (workForm.title.trim().length > 0) {
      const normalizedTitle = normalizeTitle(workForm.title).trim();
      if (normalizedTitle !== workForm.title) {
        updateWorkForm("title", normalizedTitle);
      }
      setState("FILLING");
    }
  };

  const handleBack = () => {
    setState("EMPTY");
  };

  const [showAdvanced, setShowAdvanced] = useState(false);
  const normalizeTitle = (value: string) => value.replace(/\s*\n+\s*/g, " ");

  const handleCreate = async () => {
    const projectId = await createWork();
    if (projectId && generationProjectId) {
      setState("GENERATING");
    }
  };

  const levelInfo = EDUCATION_LEVELS.find(
    (l) => l.value === workForm.educationLevel,
  );

  // ── GENERATING state ──────────────────────────────────────────────
  if (state === "GENERATING" || (isCreating && generationProjectId)) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-[28px] glass glass-border p-6 lg:p-8">
          <p className="mb-4 text-sm font-medium text-muted-foreground">
            &ldquo;{workForm.title}&rdquo;
          </p>
          <GenerateWorkProgress
            steps={[...GENERATION_STEPS]}
            activeIndex={generationStep}
          />
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Podes fechar esta página. O trabalho continua a gerar em segundo plano.
          <Link
            href={generationProjectId ? `/app/trabalhos/${generationProjectId}` : "/app/trabalhos"}
            className="ml-1 font-medium text-primary hover:underline"
          >
            {generationProjectId ? "Abrir trabalho" : "Ver trabalhos"} →
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Greeting — always visible */}
      <div className="space-y-2 text-center">
        <p className="text-sm text-muted-foreground">
          Olá, {firstName}
        </p>
        <h2 className="text-3xl font-semibold tracking-tight">
          Que tema pode a Aptto criar para ti hoje?
        </h2>
      </div>

      {/* Title + Level — always visible */}
      <div className="space-y-4">
        <Textarea
          id="inline-title"
          placeholder="Qual o tema do teu trabalho?"
          value={workForm.title}
          onChange={(e) =>
            updateWorkForm(
              "title",
              state === "EMPTY" ? e.target.value : normalizeTitle(e.target.value)
            )
          }
          onKeyDown={(e) => {
            if (state === "EMPTY" && e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleContinue();
            }
            if (state === "FILLING" && e.key === "Enter") {
              e.preventDefault();
            }
          }}
          rows={state === "EMPTY" ? 2 : 3}
          className={cn(
            "resize-none text-lg leading-relaxed",
            state === "FILLING" && "min-h-[96px] font-medium"
          )}
        />

        {/* Education level — cards in EMPTY, compact badge in FILLING */}
        {state === "EMPTY" ? (
          <div className="grid grid-cols-3 gap-2">
            {EDUCATION_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => handleEducationLevelChange(level.value)}
                aria-pressed={workForm.educationLevel === level.value}
                className={cn(
                  "rounded-xl border p-3 text-center transition-colors",
                  workForm.educationLevel === level.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border/60 hover:border-border",
                )}
              >
                <div className="text-lg">{level.icon}</div>
                <div className="mt-1 text-xs font-medium leading-tight">
                  {level.label}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-2.5">
            <span className="text-xs text-muted-foreground">Nível académico</span>
            <button
              type="button"
              onClick={handleBack}
              className="text-xs font-medium text-foreground hover:text-primary transition-colors"
            >
              {levelInfo?.icon} {levelInfo?.label} →
            </button>
          </div>
        )}
      </div>

      {/* CTA — changes text but never disappears */}
      <Button
        onClick={state === "EMPTY" ? handleContinue : () => void handleCreate()}
        disabled={
          !workForm.title.trim() ||
          (subscriptionStatus
            ? !subscriptionStatus.canGenerate
            : false)
        }
        size="lg"
        className="h-14 w-full gap-2 rounded-2xl text-base"
      >
        <Sparkles className="h-5 w-5" />
        {state === "EMPTY" ? "Continuar" : "Gerar trabalho"}
      </Button>

      {/* Subscription hint — only when limit reached */}
      {subscriptionStatus && !subscriptionStatus.canGenerate && (
        <div className="rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          Limite de trabalhos atingido este mês. Faz upgrade do plano ou
          compra trabalhos extras.
        </div>
      )}

      {/* Details section — progressively revealed */}
      {state === "FILLING" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4 overflow-hidden"
        >
          {/* Conditional education fields */}
          <EducationFields
            key={workForm.educationLevel}
            educationLevel={workForm.educationLevel}
            form={workForm}
            onUpdate={updateWorkForm}
            onInstitutionChange={handleInstitutionChange}
          />

          {/* Advanced details — inline expand */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            aria-expanded={showAdvanced}
            aria-controls="advanced-work-details"
            className="flex w-full items-center justify-between rounded-xl border border-border/60 px-4 py-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/20 hover:text-foreground"
          >
            <span>{showAdvanced ? "Ocultar detalhes avançados" : "+ Adicionar detalhes avançados"}</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", showAdvanced && "rotate-180")} />
          </button>

          {showAdvanced && (
            <motion.div
              id="advanced-work-details"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4 overflow-hidden"
            >
              {/* Cover template — auto-selected */}
              <div className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Capa: <span className="font-medium text-foreground">{getTemplateLabel(workForm.coverTemplate)}</span>
                  {levelInfo ? ` (${levelInfo.label})` : ""}
                </p>
              </div>

              <div className="space-y-4 rounded-2xl border border-border/50 bg-background/60 p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Conteudo do trabalho
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ajusta o foco academico antes de gerar o documento.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="objective">Objetivo</Label>
                  <Textarea
                    id="objective"
                    value={workForm.objective}
                    onChange={(e) =>
                      updateWorkForm("objective", e.target.value)
                    }
                    rows={2}
                    placeholder="Ajuda a IA a manter o foco ao gerar o conteúdo."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="methodology">
                    Metodologia ou orientação
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {workForm.educationLevel === "SECONDARY"
                      ? "Preencha apenas se o professor pediu."
                      : "Descreva a abordagem a seguir."}
                  </p>
                  <Textarea
                    id="methodology"
                    value={workForm.methodology}
                    onChange={(e) =>
                      updateWorkForm("methodology", e.target.value)
                    }
                    rows={2}
                    placeholder="Ex.: revisão bibliográfica e estudo comparativo."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="research-question">
                    Pergunta de investigação
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {workForm.educationLevel === "SECONDARY"
                      ? "Preencha apenas se o professor pediu."
                      : "A pergunta central que o trabalho vai responder."}
                  </p>
                  <Textarea
                    id="research-question"
                    value={workForm.researchQuestion}
                    onChange={(e) =>
                      updateWorkForm("researchQuestion", e.target.value)
                    }
                    rows={2}
                    placeholder="Ex.: Quais os factores que influenciam a digitalização no sector bancário em Moçambique?"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subtitle">Subtítulo</Label>
                  <Input
                    id="subtitle"
                    value={workForm.subtitle}
                    onChange={(e) =>
                      updateWorkForm("subtitle", e.target.value)
                    }
                    placeholder="Ex.: Um estudo de caso no sector bancário moçambicano"
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-border/50 bg-background/60 p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Referências e formatação
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Define as pistas editoriais que vao orientar a estrutura final.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keywords">Palavras-chave</Label>
                  <Input
                    id="keywords"
                    value={workForm.keywords}
                    onChange={(e) =>
                      updateWorkForm("keywords", e.target.value)
                    }
                    placeholder="Ex.: digitalização, sector bancário, Moçambique"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="references-seed">
                    Referências iniciais
                  </Label>
                  <Textarea
                    id="references-seed"
                    value={workForm.referencesSeed}
                    onChange={(e) =>
                      updateWorkForm("referencesSeed", e.target.value)
                    }
                    rows={2}
                    placeholder="Autores, livros, artigos ou links que devem orientar o trabalho."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="citation-style">Norma de citação</Label>
                  <Select
                    value={workForm.citationStyle}
                    onValueChange={(value) =>
                      updateWorkForm(
                        "citationStyle",
                        value as typeof workForm.citationStyle,
                      )
                    }
                  >
                    <SelectTrigger id="citation-style">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ABNT">ABNT</SelectItem>
                      <SelectItem value="APA">APA</SelectItem>
                      <SelectItem value="Vancouver">Vancouver</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additional-instructions">
                    Notas adicionais
                  </Label>
                  <Textarea
                    id="additional-instructions"
                    value={workForm.additionalInstructions}
                    onChange={(e) =>
                      updateWorkForm(
                        "additionalInstructions",
                        e.target.value,
                      )
                    }
                    rows={2}
                    placeholder="Ex.: incluir exemplos de Moçambique."
                  />
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Recent works — always visible below the CTA */}
      {recentProjects.length > 0 && (
        <Card className="glass glass-border rounded-[28px] bg-background/80">
          <CardContent className="space-y-3 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              ou continua onde paraste
            </p>
            {recentProjects.map((project) => (
              <Link
                key={project.id}
                href={`/app/trabalhos/${project.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/55 px-4 py-3 transition-colors hover:bg-background/80"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {project.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {project.type?.replace(/_/g, " ")}
                    {project.brief?.institutionName
                      ? ` · ${project.brief.institutionName}`
                      : ""}
                    {project.updatedAt
                      ? ` · ${formatRelativeTime(new Date(project.updatedAt))}`
                      : ""}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium text-primary">
                  Abrir →
                </span>
              </Link>
            ))}
            {projects.length > 3 && (
              <div className="pt-1">
                <Button
                  variant="ghost"
                  asChild
                  className="w-full rounded-full text-xs"
                >
                  <Link href="/app/trabalhos">
                    Ver todos os trabalhos ({projects.length})
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {recentProjects.length === 0 && (
        <div className="py-8 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            Ainda não criaste nenhum trabalho.
          </p>
        </div>
      )}
    </div>
  );
}
