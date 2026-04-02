"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatRelativeTime } from "@/lib/utils";
import { GenerateWorkProgress } from "@/components/work-creation/GenerateWorkProgress";
import { CoverTemplateSelector } from "@/components/work-creation/CoverTemplateSelector";
import { EducationFields } from "@/components/work-creation/EducationFields";
import {
  useWorkCreation,
  GENERATION_STEPS,
} from "@/hooks/use-work-creation";
import type { AcademicEducationLevel } from "@/types/editor";
import { useAppShellData } from "@/components/app-shell/AppShellDataContext";

type CreatorState = "EMPTY" | "FILLING" | "GENERATING";

export function InlineWorkCreator() {
  const { data: session } = useSession();
  const { projects } = useAppShellData();

  const {
    workForm,
    updateWorkForm,
    handleEducationLevelChange,
    createWork,
    isCreating,
    generationStep,
    generationProjectId,
    subscriptionStatus,
  } = useWorkCreation();

  const [state, setState] = useState<CreatorState>("EMPTY");

  const firstName = session?.user?.name?.split(" ")[0] || "Estudante";
  const recentProjects = projects.slice(0, 3);

  const handleStartFilling = () => {
    if (workForm.title.trim().length > 0) {
      setState("FILLING");
    }
  };

  const handleCreate = async () => {
    const projectId = await createWork();
    if (projectId && generationProjectId) {
      setState("GENERATING");
    }
  };

  const handleBack = () => {
    setState("EMPTY");
  };

  const EDUCATION_LEVELS: { value: AcademicEducationLevel; label: string; icon: string }[] = [
    { value: "SECONDARY", label: "Secundário", icon: "📚" },
    { value: "TECHNICAL", label: "Técnico", icon: "🔧" },
    { value: "HIGHER_EDUCATION", label: "Superior", icon: "🎓" },
  ];

  // ── GENERATING state ──────────────────────────────────────────────
  if (state === "GENERATING" || (isCreating && generationProjectId)) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-[28px] glass glass-border p-6 lg:p-8">
          <p className="text-sm font-medium text-muted-foreground mb-4">
            &ldquo;{workForm.title}&rdquo;
          </p>
          <GenerateWorkProgress
            steps={[...GENERATION_STEPS]}
            activeIndex={generationStep}
          />
        </div>
      </div>
    );
  }

  // ── FILLING state ─────────────────────────────────────────────────
  if (state === "FILLING") {
    const levelInfo = EDUCATION_LEVELS.find((l) => l.value === workForm.educationLevel);

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-1 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <span className="text-sm text-muted-foreground">
            {levelInfo?.icon} {levelInfo?.label}
          </span>
        </div>

        {/* Title */}
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            &ldquo;{workForm.title}&rdquo;
          </h2>
        </div>

        {/* Education Level selector (can change here too) */}
        <div className="space-y-2">
          <Label>Nível académico</Label>
          <div className="grid grid-cols-3 gap-2">
            {EDUCATION_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => handleEducationLevelChange(level.value)}
                className={cn(
                  "rounded-xl border p-2 text-center text-xs transition-colors",
                  workForm.educationLevel === level.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border/60 hover:border-border",
                )}
              >
                <span className="text-base">{level.icon}</span>
                <div className="mt-0.5 font-medium">{level.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Conditional education fields */}
        <EducationFields
          educationLevel={workForm.educationLevel}
          form={workForm}
          onUpdate={updateWorkForm}
        />

        {/* Cover template */}
        <CoverTemplateSelector
          value={workForm.coverTemplate}
          onChange={(value) => updateWorkForm("coverTemplate", value)}
        />

        {/* More options */}
        <Accordion type="single" collapsible>
          <AccordionItem value="more" className="border-border/60">
            <AccordionTrigger className="text-xs font-medium text-muted-foreground hover:text-foreground">
              Mais opções
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="objective">Objetivo</Label>
                  <Textarea
                    id="objective"
                    value={workForm.objective}
                    onChange={(e) => updateWorkForm("objective", e.target.value)}
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
                    onChange={(e) => updateWorkForm("methodology", e.target.value)}
                    rows={2}
                    placeholder="Ex.: revisão bibliográfica e estudo comparativo."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="references-seed">Referências iniciais</Label>
                  <Textarea
                    id="references-seed"
                    value={workForm.referencesSeed}
                    onChange={(e) => updateWorkForm("referencesSeed", e.target.value)}
                    rows={2}
                    placeholder="Autores, livros, artigos ou links que devem orientar o trabalho."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="citation-style">Norma de citação</Label>
                  <Select
                    value={workForm.citationStyle}
                    onValueChange={(value) =>
                      updateWorkForm("citationStyle", value as typeof workForm.citationStyle)
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
                  <Label htmlFor="additional-instructions">Notas adicionais</Label>
                  <Textarea
                    id="additional-instructions"
                    value={workForm.additionalInstructions}
                    onChange={(e) =>
                      updateWorkForm("additionalInstructions", e.target.value)
                    }
                    rows={2}
                    placeholder="Ex.: incluir exemplos de Moçambique."
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Subscription info */}
        <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          {subscriptionStatus ? (
            <>
              Tem{" "}
              <span className="font-medium text-foreground">
                {subscriptionStatus.remaining} trabalho
                {subscriptionStatus.remaining !== 1 ? "s" : ""}
              </span>{" "}
              disponível{subscriptionStatus.remaining !== 1 ? "is" : ""} este mês.
              {!subscriptionStatus.canGenerate && (
                <span className="block mt-1 text-warning font-medium">
                  Limite atingido. Faça upgrade do plano ou compre trabalhos extras.
                </span>
              )}
            </>
          ) : (
            <>A geração completa deste trabalho usa 1 dos seus trabalhos mensais disponíveis.</>
          )}
        </div>

        {/* Generate button */}
        <Button
          onClick={() => void handleCreate()}
          disabled={
            !workForm.title.trim() ||
            (subscriptionStatus ? !subscriptionStatus.canGenerate : false)
          }
          size="lg"
          className="w-full h-14 rounded-2xl gap-2 text-base"
        >
          <Sparkles className="h-5 w-5" />
          Gerar trabalho
        </Button>
      </div>
    );
  }

  // ── EMPTY state ───────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Greeting */}
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">Olá, {firstName}</p>
        <h2 className="text-3xl font-semibold tracking-tight">
          Que tema pode a Aptto criar para ti hoje?
        </h2>
      </div>

      {/* Title input */}
      <div className="space-y-4">
        <Textarea
          id="inline-title"
          placeholder="Qual o tema do teu trabalho?"
          value={workForm.title}
          onChange={(e) => updateWorkForm("title", e.target.value)}
          onFocus={handleStartFilling}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleStartFilling();
            }
          }}
          rows={2}
          className="text-lg resize-none"
        />

        {/* Education level cards */}
        <div className="grid grid-cols-3 gap-2">
          {EDUCATION_LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => handleEducationLevelChange(level.value)}
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

        <Button
          onClick={handleStartFilling}
          disabled={!workForm.title.trim()}
          size="lg"
          className="w-full h-14 rounded-2xl gap-2 text-base"
        >
          <Sparkles className="h-5 w-5" />
          Continuar
        </Button>
      </div>

      {/* Recent works */}
      {recentProjects.length > 0 && (
        <Card className="glass glass-border rounded-[28px] bg-background/80">
          <CardContent className="p-5 space-y-3">
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
                <Button variant="ghost" asChild className="w-full rounded-full text-xs">
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
        <div className="text-center py-8">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            Ainda não criaste nenhum trabalho.
          </p>
        </div>
      )}
    </div>
  );
}
