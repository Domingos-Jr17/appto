"use client";

import { cn } from "@/lib/utils";
import { getTemplateLabel } from "@/lib/cover-template-config";
import { parseMarkdownBlocks, normalizeStoredContent } from "@/lib/content";
import type { WorkBrief, WorkSection } from "@/types/workspace";

// ── Types ──────────────────────────────────────────────────────────────

interface DocumentPreviewProps {
  sections: WorkSection[];
  isGenerating: boolean;
  brief?: WorkBrief | null;
}

// ── Main Component ─────────────────────────────────────────────────────

export function DocumentPreview({
  sections,
  isGenerating,
  brief,
}: DocumentPreviewProps) {
  const hasContent = sections.some(
    (s) => s.status === "done" && s.content.trim().length > 0,
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

  const coverSection = sections.find((s) => s.title === "Capa");
  const contentSections = sections.filter((s) => s.title !== "Capa");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* A4 Page */}
      <div className="doc-page w-full rounded-2xl border p-6 sm:p-8 md:p-10 lg:p-12">
        <article className="space-y-0">
          {/* Cover */}
          {coverSection && (
            <div className="flex min-h-[50vh] flex-col items-center justify-center pb-8 sm:min-h-[60vh] sm:pb-12">
              <CoverPreviewCard brief={brief} />
            </div>
          )}

          {/* Page separator */}
          {coverSection && contentSections.length > 0 && (
            <div className="mb-8 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--doc-border)]" />
              <span className="text-xs text-[var(--doc-muted)]">• • •</span>
              <div className="h-px flex-1 bg-[var(--doc-border)]" />
            </div>
          )}

          {/* Content sections */}
          <div className="space-y-6">
            {contentSections.map((section) => (
              <DocumentSection key={section.id} section={section} />
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}

// ── Section Renderer ───────────────────────────────────────────────────

function DocumentSection({ section }: { section: WorkSection }) {
  if (section.status === "done" && section.content.trim()) {
    return (
      <section className="mb-6">
        <h2 className="mb-3 text-base font-bold text-[var(--doc-heading)]">
          {section.title}
        </h2>
        <RenderedMarkdown content={section.content} />
      </section>
    );
  }

  if (section.status === "generating") {
    return (
      <section className="mb-4">
        <h2 className="mb-2 text-base font-bold text-[var(--doc-muted)]">
          {section.title}
        </h2>
        <div className="flex items-center gap-2 py-3">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--doc-muted)] border-t-[var(--doc-heading)]" />
          <span className="text-xs text-[var(--doc-muted)]">A gerar...</span>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-4">
      <h2 className="mb-2 text-base font-bold text-[var(--doc-muted)]/50">
        {section.title}
      </h2>
      <div className="h-12 rounded border border-dashed border-[var(--doc-border)]" />
    </section>
  );
}

// ── Markdown Renderer ──────────────────────────────────────────────────

function RenderedMarkdown({ content }: { content: string }) {
  const blocks = parseMarkdownBlocks(normalizeStoredContent(content));

  if (blocks.length === 0) {
    return (
      <p className="text-sm leading-7 text-[var(--doc-text)] text-justify">
        {content}
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return <HeadingBlock key={i} block={block} />;
        }
        if (block.type === "paragraph") {
          return <ParagraphBlock key={i} text={block.text || ""} />;
        }
        if (block.type === "quote") {
          return <QuoteBlock key={i} text={block.text || ""} />;
        }
        if (block.type === "list") {
          return <ListBlock key={i} items={block.items || []} />;
        }
        return null;
      })}
    </div>
  );
}

function HeadingBlock({ block }: { block: { level?: number; text?: string } }) {
  const sizes: Record<number, string> = {
    1: "text-lg",
    2: "text-[15px]",
    3: "text-sm",
    4: "text-sm",
    5: "text-sm",
    6: "text-sm",
  };
  const level = block.level || 2;

  return (
    <h3
      className={cn(
        "mt-5 mb-2 font-bold text-[var(--doc-heading)]",
        sizes[level] || "text-sm",
      )}
    >
      {block.text}
    </h3>
  );
}

function ParagraphBlock({ text }: { text: string }) {
  return (
    <p className="mb-4 text-sm leading-7 text-[var(--doc-text)] text-justify first-letter:ml-[1.25cm]">
      {text}
    </p>
  );
}

function QuoteBlock({ text }: { text: string }) {
  return (
    <blockquote className="mb-4 ml-8 border-l-2 border-[var(--doc-muted)] pl-4 text-sm italic text-[var(--doc-muted)]">
      {text}
    </blockquote>
  );
}

function ListBlock({ items }: { items: string[] }) {
  return (
    <ul className="mb-4 ml-6 list-disc space-y-1 text-sm text-[var(--doc-text)]">
      {items.map((item, i) => (
        <li key={i} className="leading-7">
          {item}
        </li>
      ))}
    </ul>
  );
}

// ── Cover Preview Card ─────────────────────────────────────────────────

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
    <div className="mx-auto w-full max-w-[40rem] rounded-[24px] border border-slate-200/60 bg-white p-6 text-slate-900 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.55)] sm:p-8 md:p-10 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-100 dark:shadow-[0_24px_60px_-36px_rgba(0,0,0,0.7)]">
      <div className="flex min-h-[24rem] flex-col text-center sm:min-h-[32rem]">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-slate-500 sm:text-xs dark:text-slate-400">
            Pré-visualização da capa • {templateLabel}
          </p>
          <div className="mt-5 space-y-2">
            <p className="text-sm font-semibold uppercase leading-snug sm:text-base">
              {institution}
            </p>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 sm:text-sm dark:text-slate-400">
              {course}
            </p>
          </div>
        </div>

        <div className="my-auto space-y-5">
          <div className="mx-auto h-px w-16 bg-slate-300 sm:w-24 dark:bg-slate-600" />
          <div className="space-y-3">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-slate-500 sm:text-xs dark:text-slate-400">
              {workType}
            </p>
            <h3 className="text-lg font-semibold leading-tight sm:text-2xl">
              {title}
            </h3>
          </div>
          <div className="mx-auto h-px w-16 bg-slate-300 sm:w-24 dark:bg-slate-600" />
        </div>

        <div className="space-y-3 border-t border-slate-200 pt-4 text-left text-xs text-slate-600 sm:text-sm dark:border-slate-700 dark:text-slate-300">
          {secondaryMeta ? (
            <div className="flex items-start justify-between gap-4">
              <span className="font-medium uppercase tracking-[0.12em] text-slate-400">
                Referência
              </span>
              <span className="max-w-[70%] text-right text-slate-700 dark:text-slate-200">
                {secondaryMeta}
              </span>
            </div>
          ) : null}
          <div className="flex items-start justify-between gap-4">
            <span className="font-medium uppercase tracking-[0.12em] text-slate-400">
              Estudante
            </span>
            <span className="max-w-[70%] text-right font-medium text-slate-900 dark:text-slate-50">
              {student}
            </span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <span className="font-medium uppercase tracking-[0.12em] text-slate-400">
              Orientador
            </span>
            <span className="max-w-[70%] text-right text-slate-700 dark:text-slate-200">
              {advisor}
            </span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <span className="font-medium uppercase tracking-[0.12em] text-slate-400">
              Local
            </span>
            <span className="text-right text-slate-700 dark:text-slate-200">
              {city} - {year}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatWorkType(workType?: string) {
  if (!workType) return "Trabalho académico";
  return workType
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function fallbackInstitution(educationLevel?: string) {
  if (educationLevel === "SECONDARY") return "Escola Secundária";
  if (educationLevel === "TECHNICAL") return "Instituto Técnico";
  return "Instituição académica";
}

function getCoverCourseLabel(brief?: WorkBrief | null) {
  if (!brief) return "Curso / disciplina";
  if (brief.educationLevel === "SECONDARY") {
    return brief.subjectName || brief.className || "Disciplina";
  }
  if (brief.educationLevel === "TECHNICAL") {
    return brief.courseName || brief.subjectName || "Curso técnico";
  }
  return brief.courseName || brief.facultyName || brief.subjectName || "Curso / disciplina";
}

function defaultTemplateLabel(educationLevel?: string) {
  if (educationLevel === "SECONDARY") return "Escola Moçambique";
  if (educationLevel === "TECHNICAL") return "Técnico";
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
