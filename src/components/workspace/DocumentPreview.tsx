"use client";

import { getTemplateLabel } from "@/lib/cover-template-config";
import type { WorkBrief, WorkSection } from "@/types/workspace";

interface DocumentPreviewProps {
  sections: WorkSection[];
  isGenerating: boolean;
  brief?: WorkBrief | null;
}

export function DocumentPreview({
  sections,
  isGenerating,
  brief,
}: DocumentPreviewProps) {
  const hasContent = sections.some(
    (s) => s.status === "done" && s.content.trim().length > 0
  );

  if (!hasContent && !isGenerating) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-8 py-12">
          <p className="text-sm font-medium text-foreground">
            O teu trabalho vai aparecer aqui
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Clica em &quot;Gerar trabalho&quot; para criar o conteúdo automaticamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <article className="space-y-8">
        {sections.map((section) => (
          <DocumentSection key={section.id} section={section} brief={brief} />
        ))}
      </article>
    </div>
  );
}

function DocumentSection({
  section,
  brief,
}: {
  section: WorkSection;
  brief?: WorkBrief | null;
}) {
  const isCapa = section.title === "Capa";

  if (section.status === "done" && section.content.trim()) {
    if (isCapa) {
      return (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            {section.title}
          </h2>
          <CoverPreviewCard brief={brief} />
        </section>
      );
    }

    return (
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">
          {section.title}
        </h2>
        <div className="whitespace-pre-wrap text-sm leading-7 text-foreground/85">
          {section.content}
        </div>
      </section>
    );
  }

  if (section.status === "generating") {
    return (
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-muted-foreground">
          {section.title}
        </h2>
        <div className="flex items-center gap-3 py-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <p className="text-xs text-muted-foreground">A gerar...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-muted-foreground/50">
        {section.title}
      </h2>
      <div className="h-16 rounded-xl border border-dashed border-border/40 bg-muted/10" />
    </section>
  );
}

function CoverPreviewCard({ brief }: { brief?: WorkBrief | null }) {
  const workType = formatWorkType(brief?.workType);
  const institution = brief?.institutionName || fallbackInstitution(brief?.educationLevel);
  const course = getCoverCourseLabel(brief);
  const title = brief?.title || "Título do trabalho";
  const student = brief?.studentName || "Nome do estudante";
  const advisor = brief?.advisorName || "Nome do orientador";
  const city = brief?.city || "Maputo";
  const year = brief?.year || String(new Date().getFullYear());
  const templateLabel = brief?.coverTemplate
    ? getTemplateLabel(brief.coverTemplate)
    : defaultTemplateLabel(brief?.educationLevel);
  const secondaryMeta = getSecondaryMeta(brief);

  return (
    <div className="rounded-[30px] border border-border/60 bg-muted/20 p-3 sm:p-5">
      <div className="mx-auto aspect-[210/297] w-full max-w-[40rem] rounded-[24px] border border-slate-200 bg-white p-6 text-slate-900 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.55)] sm:p-8 md:p-10">
        <div className="flex h-full flex-col text-center">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-slate-500 sm:text-xs">
              Pré-visualização da capa • {templateLabel}
            </p>
            <div className="mt-5 space-y-2">
              <p className="text-sm font-semibold uppercase leading-snug sm:text-base">
                {institution}
              </p>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 sm:text-sm">
                {course}
              </p>
            </div>
          </div>

          <div className="my-auto space-y-5">
            <div className="mx-auto h-px w-16 bg-slate-300 sm:w-24" />
            <div className="space-y-3">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-slate-500 sm:text-xs">
                {workType}
              </p>
              <h3 className="text-lg font-semibold leading-tight sm:text-2xl">
                {title}
              </h3>
            </div>
            <div className="mx-auto h-px w-16 bg-slate-300 sm:w-24" />
          </div>

          <div className="space-y-3 border-t border-slate-200 pt-4 text-left text-xs text-slate-600 sm:text-sm">
            {secondaryMeta ? (
              <div className="flex items-start justify-between gap-4">
                <span className="font-medium uppercase tracking-[0.12em] text-slate-400">
                  Referência
                </span>
                <span className="max-w-[70%] text-right text-slate-700">
                  {secondaryMeta}
                </span>
              </div>
            ) : null}
            <div className="flex items-start justify-between gap-4">
              <span className="font-medium uppercase tracking-[0.12em] text-slate-400">
                Estudante
              </span>
              <span className="max-w-[70%] text-right font-medium text-slate-900">
                {student}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="font-medium uppercase tracking-[0.12em] text-slate-400">
                Orientador
              </span>
              <span className="max-w-[70%] text-right text-slate-700">
                {advisor}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="font-medium uppercase tracking-[0.12em] text-slate-400">
                Local
              </span>
              <span className="text-right text-slate-700">
                {city} - {year}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatWorkType(workType?: string) {
  if (!workType) return "Trabalho académico";

  return workType
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function fallbackInstitution(educationLevel?: string) {
  if (educationLevel === "SECONDARY") {
    return "Escola Secundária";
  }

  if (educationLevel === "TECHNICAL") {
    return "Instituto Técnico";
  }

  return "Instituição académica";
}

function getCoverCourseLabel(brief?: WorkBrief | null) {
  if (!brief) {
    return "Curso / disciplina";
  }

  if (brief.educationLevel === "SECONDARY") {
    return brief.subjectName || brief.className || "Disciplina";
  }

  if (brief.educationLevel === "TECHNICAL") {
    return brief.courseName || brief.subjectName || "Curso técnico";
  }

  return brief.courseName || brief.facultyName || brief.subjectName || "Curso / disciplina";
}

function defaultTemplateLabel(educationLevel?: string) {
  if (educationLevel === "SECONDARY") {
    return "Escola Moçambique";
  }

  if (educationLevel === "TECHNICAL") {
    return "Técnico";
  }

  return "Académico";
}

function getSecondaryMeta(brief?: WorkBrief | null) {
  if (!brief) return null;

  if (brief.educationLevel === "SECONDARY") {
    return [brief.className, brief.turma, brief.studentNumber].filter(Boolean).join(" • ") || null;
  }

  if (brief.educationLevel === "TECHNICAL") {
    return [brief.courseName, brief.semester, brief.studentNumber].filter(Boolean).join(" • ") || null;
  }

  return [brief.facultyName, brief.departmentName, brief.studentNumber].filter(Boolean).join(" • ") || null;
}
