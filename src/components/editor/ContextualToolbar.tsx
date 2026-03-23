"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ContextualToolbarProps {
  onImprove: (text: string) => Promise<string>;
  onApply: (text: string) => void;
}

export function ContextualToolbar({ onImprove, onApply }: ContextualToolbarProps) {
  const [selectedText, setSelectedText] = useState("");
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() || "";

      if (text.length < 5) {
        setSelectedText("");
        setPosition(null);
        setResult(null);
        return;
      }

      setSelectedText(text);
      setResult(null);

      const range = selection?.getRangeAt(0);
      if (range) {
        const rect = range.getBoundingClientRect();
        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 8,
        });
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        if (!window.getSelection()?.toString().trim()) {
          setSelectedText("");
          setPosition(null);
          setResult(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleImprove = async () => {
    if (!selectedText || isProcessing) return;
    setIsProcessing(true);
    try {
      const improved = await onImprove(selectedText);
      setResult(improved);
    } catch {
      setResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!selectedText || !position) return null;

  return (
    <div
      ref={toolbarRef}
      className="fixed z-[60]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, -100%)",
      }}
    >
      <div className="flex items-center gap-1 rounded-2xl border border-border/60 bg-background px-2 py-1.5 shadow-lg">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 rounded-full px-2.5 text-[11px]"
          onClick={handleImprove}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="mr-1 h-3 w-3" />
          )}
          Melhorar
        </Button>

        <Button
          size="sm"
          variant="ghost"
          className="h-7 rounded-full px-2.5 text-[11px]"
          onClick={() => {
            navigator.clipboard.writeText(selectedText);
          }}
        >
          Copiar
        </Button>

        {result ? (
          <Button
            size="sm"
            variant="default"
            className="h-7 rounded-full px-2.5 text-[11px]"
            onClick={() => {
              onApply(result);
              setSelectedText("");
              setPosition(null);
              setResult(null);
            }}
          >
            <Wand2 className="mr-1 h-3 w-3" />
            Aplicar
          </Button>
        ) : null}
      </div>

      {result ? (
        <div className="mt-1 max-w-[400px] rounded-2xl border border-border/60 bg-background p-3 shadow-lg">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Sugestao
          </p>
          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-foreground">
            {result}
          </p>
        </div>
      ) : null}
    </div>
  );
}
