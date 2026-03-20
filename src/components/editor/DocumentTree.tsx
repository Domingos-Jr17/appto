"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  FolderOpen,
  Plus,
  MoreHorizontal,
  GripVertical,
  Trash2,
  Edit3,
  Copy,
} from "lucide-react";

interface Section {
  id: string;
  title: string;
  type: "chapter" | "section";
  children?: Section[];
  wordCount?: number;
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

export function DocumentTree({
  projectTitle,
  sections,
  activeSectionId,
  onSectionSelect,
  onSectionAdd,
  onSectionRename,
  onSectionDelete,
}: DocumentTreeProps) {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set(sections.filter((s) => s.type === "chapter").map((s) => s.id))
  );
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const toggleChapter = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  const handleDragStart = (e: React.DragEvent, sectionId: string) => {
    setDraggedItem(sectionId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    if (draggedItem !== sectionId) {
      setDragOverItem(sectionId);
    }
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDraggedItem(null);
    setDragOverItem(null);
    // Reorder logic would be implemented here
  };

  const handleRename = (sectionId: string) => {
    if (editingTitle.trim()) {
      onSectionRename(sectionId, editingTitle.trim());
    }
    setEditingId(null);
    setEditingTitle("");
  };

  const startEditing = (section: Section) => {
    setEditingId(section.id);
    setEditingTitle(section.title);
  };

  const renderSection = (section: Section, depth: number = 0) => {
    const isExpanded = expandedChapters.has(section.id);
    const isActive = activeSectionId === section.id;
    const isEditing = editingId === section.id;
    const isDragOver = dragOverItem === section.id;
    const hasChildren = section.children && section.children.length > 0;

    return (
      <div key={section.id}>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, section.id)}
              onDragOver={(e) => handleDragOver(e, section.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, section.id)}
              onClick={() => !isEditing && onSectionSelect(section.id)}
              className={cn(
                "group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all duration-200",
                "hover:bg-accent/50",
                isActive && [
                  "bg-primary/10 border border-primary/30",
                  "shadow-[0_0_15px_rgba(var(--primary),0.15)]",
                ],
                isDragOver && "bg-accent/70 border border-primary/50",
                depth > 0 && "ml-4"
              )}
            >
              {/* Drag Handle */}
              <GripVertical className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />

              {/* Expand/Collapse for chapters */}
              {section.type === "chapter" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleChapter(section.id);
                  }}
                  className="flex-shrink-0 p-0.5 hover:bg-accent rounded transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              )}

              {/* Icon */}
              {section.type === "chapter" ? (
                <FolderOpen
                  className={cn(
                    "h-4 w-4 flex-shrink-0",
                    isExpanded ? "text-primary" : "text-muted-foreground"
                  )}
                />
              ) : (
                <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              )}

              {/* Title */}
              {isEditing ? (
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={() => handleRename(section.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(section.id);
                    if (e.key === "Escape") {
                      setEditingId(null);
                      setEditingTitle("");
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-background/50 border border-primary/50 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
              ) : (
                <span className="flex-1 text-sm truncate">{section.title}</span>
              )}

              {/* Word Count */}
              {section.wordCount !== undefined && (
                <span className="text-xs text-muted-foreground/70">
                  {section.wordCount}
                </span>
              )}
            </div>
          </ContextMenuTrigger>

          <ContextMenuContent className="w-48">
            <ContextMenuItem onClick={() => startEditing(section)}>
              <Edit3 className="h-4 w-4 mr-2" />
              Renomear
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onSectionAdd(section.id)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Seção
            </ContextMenuItem>
            <ContextMenuItem>
              <Copy className="h-4 w-4 mr-2" />
              Duplicar
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => onSectionDelete(section.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* Children */}
        {section.type === "chapter" && hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {section.children!.map((child) => renderSection(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <h2 className="font-semibold text-lg truncate gradient-text">
          {projectTitle}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {sections.length} capítulo{sections.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Tree */}
      <ScrollArea className="flex-1 px-2 py-3 scrollbar-thin">
        <div className="space-y-1">
          {sections.map((section) => renderSection(section))}
        </div>
      </ScrollArea>

      {/* Add Section Button */}
      <div className="p-3 border-t border-border/50">
        <Button
          onClick={() => onSectionAdd()}
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 border-dashed border-border/50 hover:border-primary/50 hover:bg-primary/5"
        >
          <Plus className="h-4 w-4" />
          Novo Capítulo
        </Button>
      </div>
    </div>
  );
}
