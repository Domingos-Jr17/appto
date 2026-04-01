"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronDown, ChevronRight, Circle, FileText, FolderOpen, PencilLine } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Section } from "@/types/editor";

interface WorkOutlineProps {
  sections: Section[];
  activeSectionId: string | null;
  onSelectSection: (section: Section) => void;
}

export function WorkOutline({ sections, activeSectionId, onSelectSection }: WorkOutlineProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const section of sections) {
      if (section.type === "chapter") initial.add(section.id);
    }
    return initial;
  });

  const toggleExpand = (sectionId: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Estrutura do trabalho
      </p>
      <div className="space-y-1">
        {sections.map((section) => (
          <OutlineRow
            key={section.id}
            section={section}
            depth={0}
            activeSectionId={activeSectionId}
            expanded={expanded}
            onToggleExpand={toggleExpand}
            onSelectSection={onSelectSection}
          />
        ))}
      </div>
    </div>
  );
}

function OutlineRow({
  section,
  depth,
  activeSectionId,
  expanded,
  onToggleExpand,
  onSelectSection,
}: {
  section: Section;
  depth: number;
  activeSectionId: string | null;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelectSection: (section: Section) => void;
}) {
  const active = section.id === activeSectionId;
  const isExpanded = expanded.has(section.id);
  const hasChildren = section.children.length > 0;
  const hasContent = section.wordCount > 0;
  const status = getSectionState(section.wordCount);
  const StatusIcon = status.icon;
  const isChapter = section.type === "chapter";
  const canExpand = isChapter || hasContent;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-2 rounded-xl border px-2.5 py-2 transition-colors",
          active
            ? "border-primary/30 bg-primary/10"
            : status.tone === "done"
              ? "border-border/60 bg-background/70 hover:bg-background"
              : status.tone === "editing"
                ? "border-warning/40 bg-warning/10 hover:bg-warning/15"
                : "border-border/60 bg-muted/20 hover:bg-muted/35",
        )}
        style={{ marginLeft: depth * 10 }}
      >
        {canExpand ? (
          <button
            type="button"
            onClick={() => onToggleExpand(section.id)}
            className="shrink-0 rounded-full p-0.5 hover:bg-muted/50"
            aria-label={isExpanded ? "Recolher secção" : "Expandir secção"}
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="h-[14px] w-[14px] shrink-0" />
        )}

        <button
          type="button"
          onClick={() => onSelectSection(section)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          {isChapter ? (
            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
          ) : (
            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className={cn("flex-1 truncate text-xs", active ? "font-semibold text-foreground" : "text-foreground/90")}>
            {section.title}
          </span>
        </button>

        <StatusIcon className={cn("h-3.5 w-3.5 shrink-0", status.iconClass)} />
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && hasContent && (
          <motion.div
            key="preview"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ marginLeft: depth * 10 + 16 }}
            className="overflow-hidden"
          >
            <div className="mx-2 mt-0.5 rounded-lg border border-border/30 bg-muted/10 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              <p className="line-clamp-6 whitespace-pre-wrap">{section.content.slice(0, 600)}{section.content.length > 600 ? "…" : ""}</p>
            </div>
          </motion.div>
        )}

        {isExpanded && hasChildren && (
          <motion.div
            key="children"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ marginLeft: depth * 10 + 8 }}
            className="overflow-hidden"
          >
            <div className="mt-0.5 space-y-1">
              {section.children.map((child) => (
                <OutlineRow
                  key={child.id}
                  section={child}
                  depth={depth + 1}
                  activeSectionId={activeSectionId}
                  expanded={expanded}
                  onToggleExpand={onToggleExpand}
                  onSelectSection={onSelectSection}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getSectionState(wordCount: number) {
  if (wordCount <= 0) {
    return {
      label: "Pendente",
      icon: Circle,
      tone: "pending" as const,
      iconClass: "text-muted-foreground",
      textClass: "text-muted-foreground",
    };
  }

  if (wordCount < 180) {
    return {
      label: "A editar",
      icon: PencilLine,
      tone: "editing" as const,
      iconClass: "text-warning",
      textClass: "text-warning",
    };
  }

  return {
    label: "Pronto",
    icon: CheckCircle2,
    tone: "done" as const,
    iconClass: "text-success",
    textClass: "text-success",
  };
}
