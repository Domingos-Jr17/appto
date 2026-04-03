"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { ChevronDown, FileText, Sparkles, Loader2 } from "lucide-react";
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
import {
  useWorkCreation,
  GENERATION_STEPS,
} from "@/hooks/use-work-creation";
import type { AcademicEducationLevel } from "@/types/editor";
import type { WorkFormState } from "@/hooks/use-work-creation";
import { useAppShellData } from "@/components/app-shell/AppShellDataContext";

// ── Constants ─────────────────────────────────────────────────────────

const EDUCATION_LEVELS: {
  value: AcademicEducationLevel;
  label: string;
  icon: string;
}[] = [
  { value: "SECONDARY", label: "Secundário", icon: "📚" },
  { value: "TECHNICAL", label: "Técnico", icon: "🔧" },
  { value: "HIGHER_EDUCATION", label: "Superior", icon: "🎓" },
];

const TRANSITION = { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const };

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

  const [showCoverData, setShowCoverData] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const firstName = session?.user?.name?.split(" ")[0] || "Estudante";
  const recentProjects = projects.slice(0, 3);
  const levelInfo = EDUCATION_LEVELS.find(
    (l) => l.value === workForm.educationLevel,
  );

  const prevSearchRef = useRef<string | null>(null);

  // Handle ?new=1 → reset form
  useEffect(() => {
    const current = searchParams.get("new");
    if (prevSearchRef.current !== current && current === "1") {
      prevSearchRef.current = current;
      resetWorkForm();
    } else {
      prevSearchRef.current = current;
    }
  }, [searchParams, resetWorkForm]);

  const handleCreate = async () => {
    const projectId = await createWork();
    if (projectId && generationProjectId) {
      // State handled by isCreating + generationProjectId
    }
  };

  // ── GENERATING state ──────────────────────────────────────────────
  if (isCreating && generationProjectId) {
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
            href={`/app/trabalhos/${generationProjectId}`}
            className="ml-1 font-medium text-primary hover:underline"
          >
            Abrir trabalho →
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Greeting */}
      <div className="space-y-2 text-center">
        <p className="text-sm text-muted-foreground">
          Olá, {firstName}
        </p>
        <h2 className="text-3xl font-semibold tracking-tight">
          Que tema pode a Aptto criar para ti hoje?
        </h2>
      </div>

      {/* Theme */}
      <Textarea
        id="inline-title"
        placeholder="Qual o tema do teu trabalho?"
        value={workForm.title}
        onChange={(e) => updateWorkForm("title", e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (workForm.title.trim()) handleCreate();
          }
        }}
        rows={2}
        className="text-lg resize-none leading-relaxed"
      />

      {/* Education level */}
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

      {/* Generate button */}
      <Button
        onClick={handleCreate}
        disabled={
          !workForm.title.trim() ||
          isCreating ||
          (subscriptionStatus ? !subscriptionStatus.canGenerate : false)
        }
        size="lg"
        className="h-14 w-full gap-2 rounded-2xl text-base"
      >
        {isCreating ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            A criar...
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            Gerar trabalho
          </>
        )}
      </Button>

      {/* Subscription hint — only when limit reached */}
      {subscriptionStatus && !subscriptionStatus.canGenerate && (
        <div className="rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          Limite de trabalhos atingido este mês. Faz upgrade do plano ou
          compra trabalhos extras.
        </div>
      )}

      {/* Optional: Cover data */}
      <button
        type="button"
        onClick={() => setShowCoverData(!showCoverData)}
        aria-expanded={showCoverData}
        className="flex w-full items-center justify-between rounded-xl border border-border/60 px-4 py-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/20 hover:text-foreground"
      >
        <span>
          {showCoverData
            ? "Ocultar dados da capa"
            : "Preencher dados da capa (opcional)"}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            showCoverData && "rotate-180"
          )}
        />
      </button>

      {showCoverData && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={TRANSITION}
          className="space-y-4 overflow-hidden"
        >
          {/* Cover template info */}
          <div className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              Capa:{" "}
              <span className="font-medium text-foreground">
                {getTemplateLabel(workForm.coverTemplate)}
              </span>
              {levelInfo ? ` (${levelInfo.label})` : ""}
            </p>
          </div>

          {/* Cover fields by level */}
          <CoverFields
            educationLevel={workForm.educationLevel}
            form={workForm}
            onUpdate={updateWorkForm}
            onInstitutionChange={handleInstitutionChange}
          />
        </motion.div>
      )}

      {/* Optional: Advanced details */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        aria-expanded={showAdvanced}
        className="flex w-full items-center justify-between rounded-xl border border-border/60 px-4 py-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/20 hover:text-foreground"
      >
        <span>
          {showAdvanced
            ? "Ocultar detalhes avançados"
            : "+ Detalhes avançados (opcional)"}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            showAdvanced && "rotate-180"
          )}
        />
      </button>

      {showAdvanced && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={TRANSITION}
          className="space-y-4 overflow-hidden"
        >
          {/* Content focus */}
          <div className="space-y-4 rounded-2xl border border-border/50 bg-background/60 p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Conteúdo do trabalho
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ajusta o foco académico antes de gerar o documento.
              </p>
            </div>

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
              <Label htmlFor="methodology">Metodologia ou orientação</Label>
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
              <Label htmlFor="research-question">Pergunta de investigação</Label>
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
                onChange={(e) => updateWorkForm("subtitle", e.target.value)}
                placeholder="Ex.: Um estudo de caso no sector bancário moçambicano"
              />
            </div>
          </div>

          {/* References and formatting */}
          <div className="space-y-4 rounded-2xl border border-border/50 bg-background/60 p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Referências e formatação
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Define as pistas editoriais que vão orientar a estrutura final.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">Palavras-chave</Label>
              <Input
                id="keywords"
                value={workForm.keywords}
                onChange={(e) => updateWorkForm("keywords", e.target.value)}
                placeholder="Ex.: digitalização, sector bancário, Moçambique"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="references-seed">Referências iniciais</Label>
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
                    value as typeof workForm.citationStyle
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
        </motion.div>
      )}

      {/* Recent works */}
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

// ── Compact Cover Fields (inline, no multi-step) ──────────────────────

interface CoverFieldsProps {
  educationLevel: AcademicEducationLevel;
  form: WorkFormState;
  onUpdate: <K extends keyof WorkFormState>(key: K, value: WorkFormState[K]) => void;
  onInstitutionChange?: (value: string) => void;
}

function CoverFields({
  educationLevel,
  form,
  onUpdate,
  onInstitutionChange,
}: CoverFieldsProps) {
  if (educationLevel === "SECONDARY") {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="cover-school">Escola</Label>
          <Input
            id="cover-school"
            value={form.institutionName}
            onChange={(e) =>
              onInstitutionChange?.(e.target.value) ??
              onUpdate("institutionName", e.target.value)
            }
            placeholder="Ex.: Escola Secundária Josina Machel"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cover-student">Aluno(a)</Label>
            <Input
              id="cover-student"
              value={form.studentName}
              onChange={(e) => onUpdate("studentName", e.target.value)}
              placeholder="Ex.: Maria João"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cover-advisor">Professor(a)</Label>
            <Input
              id="cover-advisor"
              value={form.advisorName}
              onChange={(e) => onUpdate("advisorName", e.target.value)}
              placeholder="Ex.: Prof. Carlos Bento"
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="cover-class">
              Classe <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Select
              value={form.className}
              onValueChange={(v) => onUpdate("className", v)}
            >
              <SelectTrigger id="cover-class">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10ª">10ª Classe</SelectItem>
                <SelectItem value="11ª">11ª Classe</SelectItem>
                <SelectItem value="12ª">12ª Classe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cover-turma">
              Turma <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="cover-turma"
              value={form.turma}
              onChange={(e) => onUpdate("turma", e.target.value)}
              placeholder="Ex.: A"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cover-number">
              Nº <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="cover-number"
              value={form.studentNumber}
              onChange={(e) => onUpdate("studentNumber", e.target.value)}
              placeholder="Ex.: 15"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cover-city">
            Cidade <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input
            id="cover-city"
            value={form.city}
            onChange={(e) => onUpdate("city", e.target.value)}
            placeholder="Ex.: Maputo"
          />
        </div>
      </div>
    );
  }

  if (educationLevel === "TECHNICAL") {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cover-institute">Instituto</Label>
            <Input
              id="cover-institute"
              value={form.institutionName}
              onChange={(e) =>
                onInstitutionChange?.(e.target.value) ??
                onUpdate("institutionName", e.target.value)
              }
              placeholder="Ex.: ISTEG"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cover-course">Curso</Label>
            <Input
              id="cover-course"
              value={form.courseName}
              onChange={(e) => onUpdate("courseName", e.target.value)}
              placeholder="Ex.: Informática"
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cover-student">Estudante</Label>
            <Input
              id="cover-student"
              value={form.studentName}
              onChange={(e) => onUpdate("studentName", e.target.value)}
              placeholder="Ex.: Maria João"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cover-advisor">Formador(a)</Label>
            <Input
              id="cover-advisor"
              value={form.advisorName}
              onChange={(e) => onUpdate("advisorName", e.target.value)}
              placeholder="Ex.: Form. Carlos Bento"
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cover-number">
              Nº de Estudante <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="cover-number"
              value={form.studentNumber}
              onChange={(e) => onUpdate("studentNumber", e.target.value)}
              placeholder="Ex.: 2024/001"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cover-city">
              Cidade <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="cover-city"
              value={form.city}
              onChange={(e) => onUpdate("city", e.target.value)}
              placeholder="Ex.: Maputo"
            />
          </div>
        </div>
      </div>
    );
  }

  // HIGHER_EDUCATION
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cover-institution">Instituição</Label>
          <Input
            id="cover-institution"
            value={form.institutionName}
            onChange={(e) =>
              onInstitutionChange?.(e.target.value) ??
              onUpdate("institutionName", e.target.value)
            }
            placeholder="Ex.: Universidade Eduardo Mondlane"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cover-course">Curso</Label>
          <Input
            id="cover-course"
            value={form.courseName}
            onChange={(e) => onUpdate("courseName", e.target.value)}
            placeholder="Ex.: Gestão"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cover-student">Estudante</Label>
          <Input
            id="cover-student"
            value={form.studentName}
            onChange={(e) => onUpdate("studentName", e.target.value)}
            placeholder="Ex.: Maria João"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cover-advisor">Docente</Label>
          <Input
            id="cover-advisor"
            value={form.advisorName}
            onChange={(e) => onUpdate("advisorName", e.target.value)}
            placeholder="Ex.: Prof. Doutor João Luís"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cover-faculty">
            Faculdade <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input
            id="cover-faculty"
            value={form.facultyName}
            onChange={(e) => onUpdate("facultyName", e.target.value)}
            placeholder="Ex.: Faculdade de Economia"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cover-department">
            Departamento <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input
            id="cover-department"
            value={form.departmentName}
            onChange={(e) => onUpdate("departmentName", e.target.value)}
            placeholder="Ex.: Departamento de Gestão"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="cover-number">
            Nº de Estudante <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input
            id="cover-number"
            value={form.studentNumber}
            onChange={(e) => onUpdate("studentNumber", e.target.value)}
            placeholder="Ex.: 2024/001"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cover-semester">
            Semestre <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Select
            value={form.semester}
            onValueChange={(v) => onUpdate("semester", v)}
          >
            <SelectTrigger id="cover-semester">
              <SelectValue placeholder="Selecionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="I">I Semestre</SelectItem>
              <SelectItem value="II">II Semestre</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cover-city">
            Cidade <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input
            id="cover-city"
            value={form.city}
            onChange={(e) => onUpdate("city", e.target.value)}
            placeholder="Ex.: Maputo"
          />
        </div>
      </div>
    </div>
  );
}
