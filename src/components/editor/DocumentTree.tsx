"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronRight,
  Clock3,
  FileText,
  FolderOpen,
  GripVertical,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatRelativeTime } from "@/lib/utils";

interface Section {
  id: string;
  title: string;
  type: "chapter" | "section";
  content: string;
  parentId: string | null;
  order: number;
  updatedAt: string;
  wordCount: number;
  editorialStatus: "empty" | "started" | "drafting" | "review" | "stale";
  children: Section[];
}

interface DocumentTreeProps {
  projectTitle: string;
  sections: Section[];
  activeSectionId: string | null;
  onSectionSelect: (sectionId: string) => void;
  onSectionAdd: (parentId?: string) => void;
  onSectionRename: (sectionId: string, newTitle: string) => void;
  onSectionDelete: (sectionId: string) => void;
  onSectionReorder: (sections: Section[]) => void;
}

function findNodeMeta(
  sections: Section[],
  sectionId: string,
  parentId: string | null = null
): { section: Section; parentId: string | null } | null {
  for (const section of sections) {
    if (section.id === sectionId) return { section, parentId };
    if (section.children?.length) {
      const nested = findNodeMeta(section.children, sectionId, section.id);
      if (nested) return nested;
    }
  }
  return null;
}

function reorderInArray(items: Section[], draggedId: string, targetId: string) {
  const draggedIndex = items.findIndex((item) => item.id === draggedId);
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (draggedIndex === -1 || targetIndex === -1) return items;

  const nextItems = [...items];
  const [dragged] = nextItems.splice(draggedIndex, 1);
  nextItems.splice(targetIndex, 0, dragged);
  return nextItems.map((item, index) => ({
    ...item,
    order: index + 1,
  }));
}

function reorderTree(
  sections: Section[],
  parentId: string | null,
  draggedId: string,
  targetId: string
): Section[] {
  if (parentId === null) {
    return reorderInArray(sections, draggedId, targetId);
  }

  return sections.map((section) => {
    if (section.id === parentId) {
      return {
        ...section,
        children: reorderInArray(section.children || [], draggedId, targetId),
      };
    }

    if (section.children?.length) {
      return {
        ...section,
        children: reorderTree(section.children, parentId, draggedId, targetId),
      };
    }

    return section;
  });
}

function countAllSections(sections: Section[]): number {
  return sections.reduce((count, section) => count + 1 + countAllSections(section.children || []), 0);
}

function formatRelativeUpdate(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  return formatRelativeTime(value);
}

export function DocumentTree({
  projectTitle,
  sections,
  activeSectionId,
  onSectionSelect,
  onSectionAdd,
  onSectionRename,
  onSectionDelete,
  onSectionReorder,
}: DocumentTreeProps) {
  const t = useTranslations("editor.documentTree");
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(sections.filter((section) => section.type === "chapter").map((section) => section.id))
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteTitle, setPendingDeleteTitle] = useState<string | null>(null);

  const totalSections = useMemo(() => countAllSections(sections), [sections]);
  const statusCopy: Record<NonNullable<Section["editorialStatus"]>, string> = {
    empty: t("status.empty"),
    started: t("status.started"),
    drafting: t("status.drafting"),
    review: t("status.review"),
    stale: t("status.stale"),
  };

  const handleConfirmDelete = () => {
    if (pendingDeleteId) {
      onSectionDelete(pendingDeleteId);
      setPendingDeleteId(null);
      setPendingDeleteTitle(null);
    }
  };

  const handleRequestDelete = (section: Section) => {
    if (section.wordCount > 0 || (section.children?.length ?? 0) > 0) {
      setPendingDeleteId(section.id);
      setPendingDeleteTitle(section.title);
    } else {
      onSectionDelete(section.id);
    }
  };

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const draggedMeta = findNodeMeta(sections, draggedId);
    const targetMeta = findNodeMeta(sections, targetId);

    if (!draggedMeta || !targetMeta || draggedMeta.parentId !== targetMeta.parentId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    onSectionReorder(reorderTree(sections, draggedMeta.parentId, draggedId, targetId));
    setDraggedId(null);
    setDragOverId(null);
  };

  const renderSection = (section: Section, depth = 0) => {
    const isActive = activeSectionId === section.id;
    const isExpanded = expanded.has(section.id);
    const isEditing = editingId === section.id;
    const hasChildren = (section.children?.length || 0) > 0;

    return (
      <div key={section.id} className="space-y-1">
        <div
          draggable
          onDragStart={() => setDraggedId(section.id)}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOverId(section.id);
          }}
          onDragLeave={() => setDragOverId(null)}
          onDrop={() => handleDrop(section.id)}
          onClick={() => !isEditing && onSectionSelect(section.id)}
          className={cn(
            "group rounded-xl border px-3 py-3 transition-colors",
            "cursor-pointer border-transparent bg-muted/25 hover:border-border/50 hover:bg-muted/50",
            isActive && "border-primary/30 bg-primary/10",
            dragOverId === section.id && "border-primary/50 bg-primary/5",
            depth > 0 && "ml-5"
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex items-center gap-2 pt-1">
              <GripVertical className="h-4 w-4 text-muted-foreground/45" />
              {section.type === "chapter" ? (
                <button
                  type="button"
                  className="rounded-full p-0.5 hover:bg-background"
                  onClick={(event) => {
                    event.stopPropagation();
                    setExpanded((current) => {
                      const next = new Set(current);
                      if (next.has(section.id)) next.delete(section.id);
                      else next.add(section.id);
                      return next;
                    });
                  }}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </button>
              ) : (
                <span className="block h-4 w-4" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {section.type === "chapter" ? (
                      <FolderOpen className="h-4 w-4 text-primary" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    )}

                    {isEditing ? (
                      <Input
                        value={editingTitle}
                        onChange={(event) => setEditingTitle(event.target.value)}
                        onBlur={() => {
                          const nextTitle = editingTitle.trim();
                          if (nextTitle) onSectionRename(section.id, nextTitle);
                          setEditingId(null);
                          setEditingTitle("");
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            const nextTitle = editingTitle.trim();
                            if (nextTitle) onSectionRename(section.id, nextTitle);
                            setEditingId(null);
                            setEditingTitle("");
                          }
                          if (event.key === "Escape") {
                            setEditingId(null);
                            setEditingTitle("");
                          }
                        }}
                        className="h-8 rounded-xl"
                        autoFocus
                      />
                    ) : (
                      <p className="truncate text-sm font-medium text-foreground">{section.title}</p>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="rounded-full bg-background/70">
                      {statusCopy[section.editorialStatus || "empty"]}
                    </Badge>
                    <span>{(section.wordCount || 0).toLocaleString("pt-MZ")} {t("words")}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3 w-3" />
                      {formatRelativeUpdate(section.updatedAt, t("noActivity"))}
                    </span>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(event) => {
                        event.preventDefault();
                        setEditingId(section.id);
                        setEditingTitle(section.title);
                      }}
                    >
                      {t("rename")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onSectionAdd(section.id)}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t("addSubtitle")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleRequestDelete(section)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {section.type === "chapter" && hasChildren && isExpanded ? (
          <div className="space-y-1">
            {section.children?.map((child) => renderSection(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/50 p-4">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{t("map")}</p>
        <h2 className="mt-2 truncate text-lg font-semibold text-foreground">{projectTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("summary", { topLevel: sections.length, total: totalSections })}
        </p>
      </div>

      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-2">
          {sections.map((section) => renderSection(section))}
        </div>
      </ScrollArea>

      <div className="border-t border-border/50 p-3">
        <Button onClick={() => onSectionAdd()} variant="outline" className="w-full rounded-2xl border-dashed">
          <Plus className="mr-2 h-4 w-4" />
          {t("newChapter")}
        </Button>
      </div>

      <AlertDialog open={pendingDeleteId !== null} onOpenChange={(open) => {
        if (!open) {
          setPendingDeleteId(null);
          setPendingDeleteTitle(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDesc", { title: pendingDeleteTitle ?? t("title") })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-white hover:bg-destructive/90">
              {t("deleteButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
