"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { parseMarkdownBlocks } from "@/lib/content";
import { resolveDocumentProfile } from "@/lib/document-profile";
import type { WorkBrief, WorkSection } from "@/types/workspace";
import { isFrontMatterSectionTitle, isMeaningfulWorkspaceSection } from "@/lib/work-generation-state";

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
  const t = useTranslations("workspace.preview");
  const coverSection = sections.find((section) => isCoverSectionTitle(section.title, t));
  const titlePageSection = sections.find((section) => isTitlePageSectionTitle(section.title, t));
  const hasBodyContent = sections.some((section) =>
    isMeaningfulWorkspaceSection({
      title: section.title,
      content: section.status === "done" ? section.content : undefined,
      streamingContent: section.status === "streaming" ? section.streamingContent : undefined,
    }),
  );
  const hasContent = Boolean(coverSection || titlePageSection) || hasBodyContent;

  if (!hasContent && !isGenerating) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-8 py-12">
          <p className="text-sm font-medium text-foreground">
            {t("emptyTitle")}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t("emptyDescription")}
          </p>
        </div>
      </div>
    );
  }

  const contentSections = sections
    .filter((section) => !isFrontMatterSectionTitle(section.title))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="mx-auto w-full sm:max-w-3xl sm:px-4 sm:py-6">
      {/* Document page — edge-to-edge on mobile, card on desktop */}
      <div className="doc-page w-full border-x-0 sm:border-x sm:border sm:rounded-2xl sm:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_12px_40px_rgba(0,0,0,0.08)] dark:sm:shadow-[0_2px_8px_rgba(0,0,0,0.2),0_12px_40px_rgba(0,0,0,0.3)] p-6 sm:p-8 md:p-10 lg:p-12">
        <article className="space-y-0">
          {/* Cover — first page of the document */}
          {coverSection && (
            <div className="flex min-h-[70vh] flex-col justify-center pb-8 sm:min-h-[80vh] sm:pb-12">
              <CoverPage brief={brief} />
            </div>
          )}

          {coverSection && titlePageSection && (
            <div className="mb-8 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--doc-border)]" />
              <span className="text-xs text-[var(--doc-muted)]">• • •</span>
              <div className="h-px flex-1 bg-[var(--doc-border)]" />
            </div>
          )}

          {titlePageSection && (
            <div className="flex min-h-[70vh] flex-col justify-center pb-8 sm:min-h-[80vh] sm:pb-12">
              <TitlePage brief={brief} />
            </div>
          )}

          {/* Page separator */}
          {(coverSection || titlePageSection) && contentSections.length > 0 && (
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
  const t = useTranslations("workspace.preview");
  const normalizedContent = normalizeDisplayedSectionContent(section.content, section.title);
  const normalizedStreamingContent = normalizeDisplayedSectionContent(
    section.streamingContent,
    section.title,
  );

  if (section.status === "done" && normalizedContent.trim()) {
    return (
      <section className="mb-6">
        <h2 className="mb-3 text-base font-bold text-[var(--doc-heading)]">
          {section.title}
        </h2>
        <RenderedMarkdown content={normalizedContent} />
      </section>
    );
  }

  if (section.status === "streaming" && normalizedStreamingContent && normalizedStreamingContent.trim()) {
    return (
      <section className="mb-6">
        <h2 className="mb-3 text-base font-bold text-[var(--doc-heading)]">
          {section.title}
        </h2>
        <div className="animate-pulse">
          <RenderedMarkdown content={normalizedStreamingContent} />
        </div>
        <div className="flex items-center gap-2 py-2">
          <div className="h-2 w-2 animate-ping rounded-full bg-blue-400" />
          <span className="text-xs text-[var(--doc-muted)]">{t("generating")}</span>
        </div>
      </section>
    );
  }

  if (section.status === "streaming" || section.status === "generating") {
    return (
      <section className="mb-4">
        <h2 className="mb-2 text-base font-bold text-[var(--doc-muted)]">
          {section.title}
        </h2>
        <div className="flex items-center gap-2 py-3">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--doc-muted)] border-t-[var(--doc-heading)]" />
          <span className="text-xs text-[var(--doc-muted)]">{t("generating")}</span>
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
  const blocks = parseMarkdownBlocks(content);

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
        if (block.type === "table") {
          return <TableBlock key={i} headers={block.headers || []} rows={block.rows || []} />;
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
      <InlineMarkdown text={text} />
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
          <InlineMarkdown text={item} />
        </li>
      ))}
    </ul>
  );
}

function TableBlock({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-[var(--doc-border)]">
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left font-bold text-[var(--doc-heading)]">
                <InlineMarkdown text={h} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-[var(--doc-border)]">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-[var(--doc-text)]">
                  <InlineMarkdown text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InlineMarkdown({ text }: { text: string }) {
  // Parse inline markdown: links, bold, italic, code
  const parts = text.split(/(\[.+?\]\(.+?\)|\*\*.+?\*\*|_.+?_|`[^`]+`)/g);

  return (
    <>
      {parts.map((part, i) => {
        // Link: [text](url)
        const linkMatch = part.match(/^\[(.+?)\]\((.+?)\)$/);
        if (linkMatch) {
          return (
            <a
              key={i}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--doc-heading)] underline underline-offset-2 hover:opacity-80"
            >
              {linkMatch[1]}
            </a>
          );
        }
        // Bold
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        // Italic
        if (part.startsWith("_") && part.endsWith("_")) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        // Code
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={i} className="rounded bg-[var(--doc-muted)]/10 px-1 py-0.5 font-mono text-xs">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ── Cover Page (first page of document) ──────────────────────────────────

function CoverPage({ brief }: { brief?: WorkBrief | null }) {
  const previewT = useTranslations("workspace.preview");
  const profileT = useTranslations("lib.documentProfile");
  const modalT = useTranslations("workspace.cover.modal");
  const profile = resolveDocumentProfile({
    type: brief?.workType,
    educationLevel: brief?.educationLevel,
    institutionName: brief?.institutionName,
    coverTemplate: brief?.coverTemplate,
  });
  const workType = formatWorkType(brief?.workType, previewT);
  const institution = fallbackInstitution(
    profileT,
    brief?.educationLevel,
    brief?.institutionName,
    brief?.workType,
    brief?.coverTemplate,
  );
  const course = getCoverCourseLabel(brief, profileT);
  const title = brief?.title || previewT("titleFallback");
  const student = brief?.studentName || modalT("studentPlaceholder");
  const advisor = brief?.advisorName || previewT("advisorFallback");
  const city = brief?.city || previewT("cityFallback");
  const year = brief?.year || String(new Date().getFullYear());
  const secondaryMeta = getSecondaryMeta(brief);
  const advisorLabel = getAdvisorLabel(brief?.educationLevel, modalT);

  return (
    <div className="mx-auto w-full max-w-[36rem] text-center">
      {/* Header: Institution */}
      <div className="space-y-1">
        <p className="text-sm font-semibold uppercase leading-snug text-[var(--doc-heading)] sm:text-base">
          {institution}
        </p>
        {course && (
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--doc-muted)] sm:text-sm">
            {course}
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="my-8 h-px w-16 bg-[var(--doc-border)] mx-auto sm:w-24 sm:my-12" />

      {/* Title block */}
      <div className="space-y-3">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[var(--doc-muted)] sm:text-xs">
          {workType}
        </p>
        <h3 className="text-lg font-semibold leading-tight sm:text-2xl text-[var(--doc-heading)]">
          {title}
        </h3>
      </div>

      {/* Divider */}
      <div className="my-8 h-px w-16 bg-[var(--doc-border)] mx-auto sm:w-24 sm:my-12" />

      {/* Footer: Author & Details */}
      <div className="space-y-3 text-left text-xs text-[var(--doc-muted)] sm:text-sm">
        <div className="flex items-start justify-between gap-4">
            <span className="font-medium uppercase tracking-[0.12em] text-[var(--doc-muted)]/70">
              {modalT(brief?.educationLevel === "SECONDARY" ? "studentLabelSecondary" : "studentLabel")}
            </span>
          <span className="max-w-[60%] text-right font-medium text-[var(--doc-heading)]">
            {student}
          </span>
        </div>
        <div className="flex items-start justify-between gap-4">
            <span className="font-medium uppercase tracking-[0.12em] text-[var(--doc-muted)]/70">
              {advisorLabel}
            </span>
          <span className="max-w-[60%] text-right text-[var(--doc-text)]">
            {advisor}
          </span>
        </div>
        {secondaryMeta && (
          <div className="flex items-start justify-between gap-4">
              <span className="font-medium uppercase tracking-[0.12em] text-[var(--doc-muted)]/70">
                {previewT("referenceLabel")}
              </span>
            <span className="max-w-[60%] text-right text-[var(--doc-text)]">
              {secondaryMeta}
            </span>
          </div>
        )}
        <div className="flex items-start justify-between gap-4">
          <span className="font-medium uppercase tracking-[0.12em] text-[var(--doc-muted)]/70">
            {previewT("locationLabel")}
          </span>
          <span className="text-right text-[var(--doc-text)]">
            {city} — {year}
          </span>
        </div>
      </div>
    </div>
  );
}

function normalizeDisplayedSectionContent(content?: string, sectionTitle?: string) {
  if (!content?.trim() || !sectionTitle?.trim()) {
    return content || "";
  }

  const normalizeHeadingForComparison = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/^#+\s*/, "")
      .replace(/^\d+(?:\.\d+)*\.?\s+/, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  const lines = content.split("\n");
  while (lines[0]?.trim() === "") {
    lines.shift();
  }

  const firstLine = lines[0]?.trim();
  if (
    firstLine &&
    normalizeHeadingForComparison(firstLine) ===
      normalizeHeadingForComparison(sectionTitle)
  ) {
    lines.shift();
    while (lines[0]?.trim() === "") {
      lines.shift();
    }
  }

  return lines.join("\n").trim();
}

function TitlePage({ brief }: { brief?: WorkBrief | null }) {
  const previewT = useTranslations("workspace.preview");
  const profileT = useTranslations("lib.documentProfile");
  const modalT = useTranslations("workspace.cover.modal");
  const profile = resolveDocumentProfile({
    type: brief?.workType,
    educationLevel: brief?.educationLevel,
    institutionName: brief?.institutionName,
    coverTemplate: brief?.coverTemplate,
  });
  const workType = formatWorkType(brief?.workType, previewT);
  const institution = fallbackInstitution(
    profileT,
    brief?.educationLevel,
    brief?.institutionName,
    brief?.workType,
    brief?.coverTemplate,
  );
  const title = brief?.title || previewT("titleFallback");
  const subtitle = getCoverCourseLabel(brief, profileT);
  const student = brief?.studentName || modalT("studentPlaceholder");
  const advisor = brief?.advisorName || previewT("advisorFallback");
  const city = brief?.city || previewT("cityFallback");
  const year = brief?.year || String(new Date().getFullYear());
  const faculty =
    profile.educationLevel === "HIGHER_EDUCATION"
      ? brief?.facultyName || brief?.departmentName || brief?.courseName || ""
      : "";
  const advisorLabel = getAdvisorLabel(brief?.educationLevel, modalT);

  return (
    <div className="mx-auto flex w-full max-w-[36rem] flex-1 flex-col justify-between text-center">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase leading-snug text-[var(--doc-heading)] sm:text-base">
          {institution}
        </p>
        {faculty && (
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--doc-muted)] sm:text-sm">
            {faculty}
          </p>
        )}
      </div>

      <div className="space-y-4">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[var(--doc-muted)] sm:text-xs">
          {workType}
        </p>
        <h3 className="text-lg font-semibold leading-tight sm:text-2xl text-[var(--doc-heading)]">
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm italic text-[var(--doc-muted)] sm:text-base">
            {subtitle}
          </p>
        )}
      </div>

      <div className="space-y-3 text-left text-xs text-[var(--doc-muted)] sm:text-sm">
        <div className="flex items-start justify-between gap-4">
            <span className="font-medium uppercase tracking-[0.12em] text-[var(--doc-muted)]/70">
              {modalT(brief?.educationLevel === "SECONDARY" ? "studentLabelSecondary" : "studentLabel")}
            </span>
          <span className="max-w-[60%] text-right font-medium text-[var(--doc-heading)]">
            {student}
          </span>
        </div>
        <div className="flex items-start justify-between gap-4">
            <span className="font-medium uppercase tracking-[0.12em] text-[var(--doc-muted)]/70">
              {advisorLabel}
            </span>
          <span className="max-w-[60%] text-right text-[var(--doc-text)]">
            {advisor}
          </span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <span className="font-medium uppercase tracking-[0.12em] text-[var(--doc-muted)]/70">
            {previewT("locationLabel")}
          </span>
          <span className="text-right text-[var(--doc-text)]">
            {city} — {year}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatWorkType(
  workType: string | undefined,
  t: ReturnType<typeof useTranslations<"workspace.preview">>,
) {
  if (workType === "SECONDARY_WORK") return t("workTypeSecondary");
  if (workType === "TECHNICAL_WORK") return t("workTypeTechnical");
  if (workType === "HIGHER_EDUCATION_WORK") return t("workTypeHigher");
  if (!workType) return t("workTypeHigher");
  return workType.replace(/_/g, " ");
}

function isCoverSectionTitle(
  title: string | undefined,
  t: ReturnType<typeof useTranslations<"workspace.preview">>,
) {
  return matchesSectionTitle(title, ["Capa", t("coverSectionTitle")]);
}

function isTitlePageSectionTitle(
  title: string | undefined,
  t: ReturnType<typeof useTranslations<"workspace.preview">>,
) {
  return matchesSectionTitle(title, ["Folha de Rosto", t("titlePageSectionTitle")]);
}

function matchesSectionTitle(title: string | undefined, candidates: string[]) {
  if (!title) return false;

  const normalizedTitle = normalizeSectionTitle(title);
  return candidates.some((candidate) => normalizeSectionTitle(candidate) === normalizedTitle);
}

function normalizeSectionTitle(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function fallbackInstitution(
  t: ReturnType<typeof useTranslations<"lib.documentProfile">>,
  educationLevel?: string,
  institutionName?: string,
  _workType?: string,
  _coverTemplate?: string,
) {
  if (institutionName) return institutionName;
  if (educationLevel === "SECONDARY") return t("fallbackSecondarySchool");
  if (educationLevel === "TECHNICAL") return t("fallbackTechnicalInstitute");
  return t("fallbackAcademicInstitution");
}

function getCoverCourseLabel(
  brief: WorkBrief | null | undefined,
  t: ReturnType<typeof useTranslations<"lib.documentProfile">>,
) {
  if (!brief) return t("fallbackCourse");
  if (brief.educationLevel === "SECONDARY") {
    return brief.subjectName || brief.className || t("fallbackSubject");
  }
  if (brief.educationLevel === "TECHNICAL") {
    return brief.courseName || brief.subjectName || t("fallbackTechnicalCourse");
  }
  return brief.courseName || brief.facultyName || brief.subjectName || t("fallbackCourse");
}

function getAdvisorLabel(
  educationLevel: WorkBrief["educationLevel"] | undefined,
  t: ReturnType<typeof useTranslations<"workspace.cover.modal">>,
) {
  if (educationLevel === "SECONDARY") return t("advisorLabelSecondary");
  if (educationLevel === "TECHNICAL") return t("advisorLabelTechnical");
  return t("advisorLabel");
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
