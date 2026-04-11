"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { ChevronDown, FileText, Sparkles, Loader2, AlertCircle, BookOpen, Wrench, GraduationCap } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, formatRelativeTime } from "@/lib/utils";
import { getTemplateLabel } from "@/lib/cover-template-config";
import { GenerateWorkProgress } from "@/components/work-creation/GenerateWorkProgress";
import { CoverFields } from "@/components/work-creation/CoverFields";
import {
  getGenerationSteps,
  useWorkCreation,
} from "@/hooks/use-work-creation";
import type { AcademicEducationLevel } from "@/types/editor";
import type { WorkFormState } from "@/hooks/use-work-creation";
import { useAppShellData } from "@/components/app-shell/AppShellDataContext";

// ── Constants ─────────────────────────────────────────────────────────

const EDUCATION_LEVELS: {
  value: AcademicEducationLevel;
  icon: React.ElementType;
}[] = [
  { value: "SECONDARY", icon: BookOpen },
  { value: "TECHNICAL", icon: Wrench },
  { value: "HIGHER_EDUCATION", icon: GraduationCap },
];

const TRANSITION = { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const };

// ── Component ─────────────────────────────────────────────────────────

export function InlineWorkCreator() {
  const t = useTranslations("workCreation.inlineCreator");
  const tWorkCreation = useTranslations("hooks.workCreation");
  const { data: session } = useSession();
  const { projects, refresh } = useAppShellData();
  const searchParams = useSearchParams();
  const generationSteps = getGenerationSteps(tWorkCreation);

  const {
    workForm,
    updateWorkForm,
    handleEducationLevelChange,
    handleInstitutionChange,
    resetWorkForm,
    createWork,
    isCreating,
    generationStep,
    generationMessage,
    generationProjectId,
    subscriptionStatus,
  } = useWorkCreation();

  const [showCoverData, setShowCoverData] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const firstName = session?.user?.name?.split(" ")[0] || t("studentFallback");
  const recentProjects = projects.slice(0, 3);
  const levelInfo = EDUCATION_LEVELS.find((l) => l.value === workForm.educationLevel);

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
    if (projectId) {
      void refresh();
    }
  };

  // ── GENERATING state ──────────────────────────────────────────────
  if (isCreating && generationProjectId) {
    return (
        <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-[28px] bg-card border border-border/40 p-6 lg:p-8">
          <p className="mb-4 text-sm font-medium text-muted-foreground">
            &ldquo;{workForm.title}&rdquo;
          </p>
          <GenerateWorkProgress
            steps={generationSteps}
            activeIndex={generationStep}
            currentMessage={generationMessage}
          />
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {t("backgroundMessage")}
          <Link
            href={`/app/trabalhos/${generationProjectId}`}
            className="ml-1 font-medium text-primary hover:underline"
          >
            {t("openWork")}
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
          {t("greeting", { firstName })}
        </p>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("question")}
        </h2>
        {subscriptionStatus && (
          <p className="text-xs text-muted-foreground">
            {subscriptionStatus.canGenerate ? (
              t.rich("availableThisMonth", {
                count: subscriptionStatus.remaining,
                label:
                  subscriptionStatus.remaining === 1
                    ? t("worksAvailable")
                    : t("worksAvailablePlural"),
                countValue: (chunks) => (
                  <span className="font-semibold text-foreground">{chunks}</span>
                ),
              })
            ) : (
              <span className="text-warning font-medium">{t("limitReached")}</span>
            )}
          </p>
        )}
      </div>

      {/* Theme */}
        <Textarea
          id="inline-title"
          placeholder={t("placeholder")}
        value={workForm.title}
        onChange={(e) => updateWorkForm("title", e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && workForm.title.trim()) {
            e.preventDefault();
            handleCreate();
          }
        }}
        rows={2}
        className="resize-none leading-relaxed text-base sm:text-lg shadow-input-inset"
      />

      {/* Education level */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">{t("educationLevelLabel")}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {EDUCATION_LEVELS.map((level) => (
          <button
            key={level.value}
            type="button"
            onClick={() => handleEducationLevelChange(level.value)}
            aria-pressed={workForm.educationLevel === level.value}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 sm:block sm:text-center",
              workForm.educationLevel === level.value
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border/60 hover:border-border hover-elevate",
            )}
          >
             <level.icon className="h-5 w-5 sm:h-8 sm:w-8 text-muted-foreground" />
             <div className="text-sm font-medium leading-tight sm:mt-1 sm:text-xs">
               {t(`educationLevel.${getEducationLevelKey(level.value)}`)}
             </div>
           </button>
        ))}
      </div>
      </div>

      {/* Generate button */}
      {subscriptionStatus && !subscriptionStatus.canGenerate ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              disabled
              size="lg"
              className="h-14 w-full gap-2 rounded-2xl text-base opacity-60"
            >
              <AlertCircle className="h-5 w-5" />
              {t("noWorks")}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-center">
            {t("limitMessage")}
          </TooltipContent>
        </Tooltip>
      ) : (
        <Button
          onClick={handleCreate}
          disabled={
            !workForm.title.trim() ||
            isCreating ||
            (subscriptionStatus ? !subscriptionStatus.canGenerate : false)
          }
          size="lg"
          className="h-14 w-full gap-2 rounded-2xl text-base transition-all duration-200 shadow-cta shadow-cta-hover disabled:shadow-none"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              {t("creating")}
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              {t("generateButton")}
            </>
          )}
        </Button>
      )}

      {/* Subscription hint — only when limit reached */}
      {subscriptionStatus && !subscriptionStatus.canGenerate && (
        <div className="rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          <p className="font-medium">{t("limitReachedTitle")}</p>
          <p className="mt-1 text-xs opacity-80">
            {t("limitActionPrefix")}{" "}
              <Link href="/app/subscription" className="font-semibold text-warning underline underline-offset-2 hover:no-underline">
                {t("upgradeLink")}
                </Link>{" "}
              {t("limitActionMiddle")}{" "}
             <Link href="/app/subscription" className="font-semibold text-warning underline underline-offset-2 hover:no-underline">
                {t("buyLink")}
              </Link>
             {t("limitActionSuffix")}
          </p>
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
            ? t("hideCover")
            : t("showCover")}
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
               {t("coverLabel")} {" "}
               <span className="font-medium text-foreground">
                 {getTemplateLabel(workForm.coverTemplate)}
               </span>
              {levelInfo ? ` (${t(`educationLevel.${getEducationLevelKey(levelInfo.value)}`)})` : ""}
             </p>
           </div>

          {/* Cover fields by level */}
          <CoverFields
            educationLevel={workForm.educationLevel}
            institutionName={workForm.institutionName}
            courseName={workForm.courseName}
            studentName={workForm.studentName}
            advisorName={workForm.advisorName}
            city={workForm.city}
            className={workForm.className}
            turma={workForm.turma}
            studentNumber={workForm.studentNumber}
            facultyName={workForm.facultyName}
            departmentName={workForm.departmentName}
            semester={workForm.semester}
            subjectName={workForm.subjectName}
            onFieldChange={(field, value) => {
              if (field === "institutionName") {
                handleInstitutionChange(String(value ?? ""));
              } else {
                updateWorkForm(field as keyof WorkFormState, value as string);
              }
            }}
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
            ? t("hideAdvanced")
            : t("showAdvanced")}
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
          <div className="space-y-3 rounded-2xl border border-border/40 bg-muted/20 p-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {t("contentLabel")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="objective">{t("objectiveLabel")}</Label>
              <Textarea
                id="objective"
                value={workForm.objective}
                onChange={(e) => updateWorkForm("objective", e.target.value)}
                rows={2}
                placeholder={t("objectivePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="methodology">{t("methodologyLabel")}</Label>
              <Textarea
                id="methodology"
                value={workForm.methodology}
                onChange={(e) => updateWorkForm("methodology", e.target.value)}
                rows={2}
                placeholder={t("methodologyPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="research-question">{t("researchQuestionLabel")}</Label>
              <Textarea
                id="research-question"
                value={workForm.researchQuestion}
                onChange={(e) =>
                  updateWorkForm("researchQuestion", e.target.value)
                }
                rows={2}
                placeholder={t("researchQuestionPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">{t("subtitleLabel")}</Label>
              <Input
                id="subtitle"
                value={workForm.subtitle}
                onChange={(e) => updateWorkForm("subtitle", e.target.value)}
                placeholder={t("subtitlePlaceholder")}
              />
            </div>
          </div>

          {/* References and formatting */}
          <div className="space-y-3 rounded-2xl border border-border/40 bg-muted/20 p-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {t("referencesLabel")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">{t("keywordsLabel")}</Label>
              <Input
                id="keywords"
                value={workForm.keywords}
                onChange={(e) => updateWorkForm("keywords", e.target.value)}
                placeholder={t("keywordsPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="references-seed">{t("referencesSeedLabel")}</Label>
              <Textarea
                id="references-seed"
                value={workForm.referencesSeed}
                onChange={(e) =>
                  updateWorkForm("referencesSeed", e.target.value)
                }
                rows={2}
                placeholder={t("referencesSeedPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="citation-style">{t("citationStyleLabel")}</Label>
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
              <Label htmlFor="additional-instructions">{t("notesLabel")}</Label>
              <Textarea
                id="additional-instructions"
                value={workForm.additionalInstructions}
                onChange={(e) =>
                  updateWorkForm("additionalInstructions", e.target.value)
                }
                rows={2}
                placeholder={t("notesPlaceholder")}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Recent works */}
      {recentProjects.length > 0 && (
        <Card className="rounded-[28px] bg-card border border-border/40">
          <CardContent className="space-y-3 p-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
              {t("recentWorks")}
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
                  {t("open")}
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
                    {t("viewAll", { count: projects.length })}
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
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground/70">
            {t("noWorksYet")}
          </p>
        </div>
      )}
    </div>
  );
}

function getEducationLevelKey(level: AcademicEducationLevel) {
  if (level === "SECONDARY") return "secondary";
  if (level === "TECHNICAL") return "technical";
  return "higher";
}
