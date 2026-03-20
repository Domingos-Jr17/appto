"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Link2,
  ImageIcon,
  Maximize2,
  Minimize2,
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
} from "lucide-react";

interface AISuggestion {
  id: string;
  type: "grammar" | "style" | "suggestion";
  text: string;
  originalText: string;
  position: { start: number; end: number };
}

interface WritingAreaProps {
  sectionTitle: string;
  content: string;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  aiSuggestions?: AISuggestion[];
  onAcceptSuggestion?: (suggestion: AISuggestion) => void;
  onRejectSuggestion?: (suggestionId: string) => void;
}

export function WritingArea({
  sectionTitle,
  content,
  onTitleChange,
  onContentChange,
  aiSuggestions = [],
}: WritingAreaProps) {
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [showAISuggestions, setShowAISuggestions] = useState(true);
  const editorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const formatButtons = [
    { id: "bold", icon: Bold, label: "Negrito" },
    { id: "italic", icon: Italic, label: "Itálico" },
    { id: "underline", icon: Underline, label: "Sublinhado" },
  ];

  const headingButtons = [
    { id: "h1", icon: Heading1, label: "Título 1" },
    { id: "h2", icon: Heading2, label: "Título 2" },
    { id: "h3", icon: Heading3, label: "Título 3" },
  ];

  const listButtons = [
    { id: "ul", icon: List, label: "Lista" },
    { id: "ol", icon: ListOrdered, label: "Lista Numerada" },
    { id: "quote", icon: Quote, label: "Citação" },
  ];

  const alignButtons = [
    { id: "left", icon: AlignLeft, label: "Alinhar Esquerda" },
    { id: "center", icon: AlignCenter, label: "Centralizar" },
    { id: "right", icon: AlignRight, label: "Alinhar Direita" },
  ];

  const handleFormat = (formatId: string) => {
    const newFormats = new Set(activeFormats);
    if (newFormats.has(formatId)) {
      newFormats.delete(formatId);
    } else {
      newFormats.add(formatId);
    }
    setActiveFormats(newFormats);

    // Apply formatting using execCommand for basic formatting
    if (["bold", "italic", "underline"].includes(formatId)) {
      document.execCommand(formatId, false, undefined);
    }
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      onContentChange(newContent);
    }
  };

  useEffect(() => {
    // Sync content changes
    if (editorRef.current && content !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  return (
    <div
      className={cn(
        "flex flex-col h-full transition-all duration-300",
        isFocusMode && "fixed inset-0 z-50 bg-background"
      )}
    >
      {/* Toolbar */}
      <div
        className={cn(
          "flex items-center gap-1 px-4 py-2 border-b border-border/30 bg-background/95 backdrop-blur-sm transition-all duration-300",
          isFocusMode && "max-w-4xl mx-auto w-full border-x"
        )}
      >
        {/* Format buttons */}
        <div className="flex items-center gap-0.5">
          {formatButtons.map(({ id, icon: Icon, label }) => (
            <Button
              key={id}
              variant="ghost"
              size="sm"
              onClick={() => handleFormat(id)}
              className={cn(
                "h-8 w-8 p-0",
                activeFormats.has(id) &&
                  "bg-primary/20 text-primary glow-primary"
              )}
              title={label}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Heading buttons */}
        <div className="flex items-center gap-0.5">
          {headingButtons.map(({ id, icon: Icon, label }) => (
            <Button
              key={id}
              variant="ghost"
              size="sm"
              onClick={() => handleFormat(id)}
              className={cn(
                "h-8 w-8 p-0",
                activeFormats.has(id) &&
                  "bg-primary/20 text-primary glow-primary"
              )}
              title={label}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* List buttons */}
        <div className="flex items-center gap-0.5">
          {listButtons.map(({ id, icon: Icon, label }) => (
            <Button
              key={id}
              variant="ghost"
              size="sm"
              onClick={() => handleFormat(id)}
              className={cn(
                "h-8 w-8 p-0",
                activeFormats.has(id) &&
                  "bg-primary/20 text-primary glow-primary"
              )}
              title={label}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Align buttons */}
        <div className="flex items-center gap-0.5">
          {alignButtons.map(({ id, icon: Icon, label }) => (
            <Button
              key={id}
              variant="ghost"
              size="sm"
              onClick={() => handleFormat(id)}
              className={cn(
                "h-8 w-8 p-0",
                activeFormats.has(id) &&
                  "bg-primary/20 text-primary glow-primary"
              )}
              title={label}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Other tools */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Link"
          >
            <Link2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Imagem"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Destacar"
          >
            <Highlighter className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1" />

        {/* AI Suggestions toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAISuggestions(!showAISuggestions)}
          className={cn(
            "gap-2 h-8",
            showAISuggestions && "text-primary glow-primary"
          )}
          title="Sugestões da IA"
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">IA</span>
        </Button>

        {/* Focus Mode */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsFocusMode(!isFocusMode)}
          className="gap-2 h-8"
          title={isFocusMode ? "Sair do Modo Foco" : "Modo Foco"}
        >
          {isFocusMode ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
          <span className="hidden sm:inline text-xs">
            {isFocusMode ? "Sair" : "Foco"}
          </span>
        </Button>
      </div>

      {/* Editor Area */}
      <ScrollArea
        className={cn(
          "flex-1 transition-all duration-300",
          isFocusMode && "max-w-4xl mx-auto w-full"
        )}
      >
        <div
          className={cn(
            "p-6 md:p-8 lg:p-12",
            isFocusMode && "p-8 md:p-12 lg:p-16"
          )}
        >
          {/* Section Title */}
          <input
            ref={titleRef}
            type="text"
            value={sectionTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Título da Seção"
            className={cn(
              "w-full text-3xl md:text-4xl font-bold bg-transparent border-none outline-none mb-6",
              "text-foreground placeholder:text-muted-foreground/50",
              "focus:ring-0 focus:outline-none",
              "transition-all duration-200"
            )}
          />

          {/* Rich Text Editor */}
          <div
            ref={editorRef}
            contentEditable
            onInput={handleEditorInput}
            data-placeholder="Comece a escrever seu texto aqui..."
            className={cn(
              "min-h-[400px] text-lg leading-relaxed",
              "text-foreground/90",
              "focus:outline-none",
              "[&:empty]:before:content-[attr(data-placeholder)]",
              "[&:empty]:before:text-muted-foreground/40",
              "[&:empty]:before:pointer-events-none",
              // Typography styles
              "prose prose-invert max-w-none",
              "prose-headings:text-foreground prose-p:text-foreground/90",
              "prose-strong:text-foreground prose-em:text-foreground/90",
              "prose-blockquote:border-l-primary/50 prose-blockquote:bg-accent/30 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r",
              "prose-code:bg-accent/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-primary",
              "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
              // Selection styles
              "selection:bg-primary/30 selection:text-foreground"
            )}
          />

          {/* AI Suggestions Overlay */}
          {showAISuggestions && aiSuggestions.length > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Sugestões da IA
              </h4>
              {aiSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="p-3 rounded-lg bg-primary/5 border border-primary/20 animate-in fade-in-0 slide-in-from-bottom-2"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        suggestion.type === "grammar" &&
                          "bg-red-500/20 text-red-400",
                        suggestion.type === "style" &&
                          "bg-yellow-500/20 text-yellow-400",
                        suggestion.type === "suggestion" &&
                          "bg-green-500/20 text-green-400"
                      )}
                    >
                      {suggestion.type === "grammar"
                        ? "Gramática"
                        : suggestion.type === "style"
                        ? "Estilo"
                        : "Sugestão"}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground line-through">
                        {suggestion.originalText}
                      </p>
                      <p className="text-sm text-foreground mt-1">
                        {suggestion.text}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-green-400 hover:bg-green-500/20"
                      >
                        Aceitar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-red-400 hover:bg-red-500/20"
                      >
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
