"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Check, Copy, Eye, PanelRightClose, PanelRightOpen, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildCodeLines } from "./workspace-mappers";
import type { WorkspaceArtifactSource } from "./workspace-types";

interface ArtifactPanelProps {
  artifact: WorkspaceArtifactSource;
  tab: "preview" | "code";
  copied: boolean;
  collapsed: boolean;
  onTabChange: (tab: "preview" | "code") => void;
  onCopy: () => void;
  onToggleCollapsed: () => void;
}

export function ArtifactPanel({
  artifact,
  tab,
  copied,
  collapsed,
  onTabChange,
  onCopy,
  onToggleCollapsed,
}: ArtifactPanelProps) {
  const lines = useMemo(() => buildCodeLines(artifact.content), [artifact.content]);

  if (collapsed) {
    return (
      <div className="flex h-full items-start justify-center border-l border-[#e8dfd2] bg-[#f5efe6] p-2 dark:border-[#2f2923] dark:bg-[#14110f]">
        <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={onToggleCollapsed} aria-label="Expandir artefacto">
          <PanelRightOpen className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <aside className="flex h-full flex-col border-l border-[#e8dfd2] bg-[#f5efe6] text-[#2c241d] dark:border-[#2f2923] dark:bg-[#14110f] dark:text-[#efe7dc]">
      <div className="border-b border-inherit px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-[#decdb9] bg-white/70 p-1 dark:border-[#40362e] dark:bg-[#1e1a17]">
            <button
              type="button"
              className={cn(
                "flex h-8 items-center gap-1 rounded-full px-3 text-xs font-medium transition-colors",
                tab === "preview"
                  ? "bg-[#2c241d] text-[#fff5ea] dark:bg-[#efe7dc] dark:text-[#201914]"
                  : "text-[#7a6756] dark:text-[#a69281]"
              )}
              onClick={() => onTabChange("preview")}
            >
              <Eye className="h-3.5 w-3.5" /> Preview
            </button>
            <button
              type="button"
              className={cn(
                "flex h-8 items-center gap-1 rounded-full px-3 text-xs font-medium transition-colors",
                tab === "code"
                  ? "bg-[#2c241d] text-[#fff5ea] dark:bg-[#efe7dc] dark:text-[#201914]"
                  : "text-[#7a6756] dark:text-[#a69281]"
              )}
              onClick={() => onTabChange("code")}
            >
              <Code2 className="h-3.5 w-3.5" /> Codigo
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{artifact.title}</p>
            <p className="truncate text-xs text-[#7a6756] dark:text-[#a69281]">{artifact.subtitle}</p>
          </div>

          <Button
            type="button"
            variant="ghost"
            className={cn(
              "rounded-full px-3 text-xs",
              copied && "bg-[#e3f1e3] text-[#2d6a37] hover:bg-[#d3e7d3] dark:bg-[#1e2c20] dark:text-[#9bd3a4]"
            )}
            onClick={onCopy}
          >
            {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
          <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={onToggleCollapsed} aria-label="Recolher artefacto">
            <PanelRightClose className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {tab === "preview" ? (
          <div className="px-5 py-5">
            <div className="rounded-[1.75rem] border border-[#e2d6c8] bg-white/80 p-5 shadow-sm dark:border-[#312923] dark:bg-[#1a1613]">
              <div className="mb-5 border-b border-[#ebe0d3] pb-4 dark:border-[#2a231d]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b7765] dark:text-[#a69281]">
                  {artifact.source === "section" ? "Secao activa" : artifact.source === "assistant" ? "Resposta gerada" : "Resumo do projecto"}
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">{artifact.title}</h2>
              </div>
              {artifact.empty ? (
                <div className="rounded-[1.5rem] border border-dashed border-[#d8c7b2] bg-[#faf4eb] p-5 text-sm text-[#7a6756] dark:border-[#43372d] dark:bg-[#1f1a16] dark:text-[#a69281]">
                  Ainda nao existe conteudo nesta area. Use o chat para gerar material ou escolha uma secao com texto.
                </div>
              ) : (
                <div className="prose prose-sm max-w-none prose-headings:text-inherit prose-p:text-inherit dark:prose-invert">
                  <ReactMarkdown>{artifact.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="font-mono text-[12.5px] leading-6">
            {lines.map((line, index) => (
              <div key={`${index + 1}-${line}`} className="flex border-b border-[#efe5d9]/60 last:border-b-0 dark:border-[#211c18]">
                <span className="w-12 shrink-0 select-none px-3 py-1 text-right text-[#9b8977] dark:text-[#7d6e62]">{index + 1}</span>
                <span className="flex-1 whitespace-pre-wrap break-all px-3 py-1">{line.length > 0 ? line : " "}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
