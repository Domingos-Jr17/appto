"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  headingsPlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  ListsToggle,
  markdownShortcutPlugin,
  MDXEditorMethods,
  quotePlugin,
  Separator,
  toolbarPlugin,
  UndoRedo,
} from "@mdxeditor/editor";
import { Maximize2, Minimize2 } from "lucide-react";
import { ContextualToolbar } from "@/components/editor/ContextualToolbar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const MDXEditor = dynamic(
  () => import("@mdxeditor/editor").then((module) => module.MDXEditor),
  { ssr: false }
);

interface WritingAreaProps {
  sectionTitle: string;
  content: string;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onImproveSelection?: (text: string) => Promise<string>;
  onApplySelection?: (text: string) => void;
}

export function WritingArea({
  sectionTitle,
  content,
  onTitleChange,
  onContentChange,
  onImproveSelection,
  onApplySelection,
}: WritingAreaProps) {
  const [isFocusMode, setIsFocusMode] = useState(false);
  const editorRef = useRef<MDXEditorMethods | null>(null);
  const lastMarkdownRef = useRef(content);

  useEffect(() => {
    if (!editorRef.current) return;
    if (content === lastMarkdownRef.current) return;

    editorRef.current.setMarkdown(content);
    lastMarkdownRef.current = content;
  }, [content]);

  const handleImprove = async (text: string): Promise<string> => {
    if (!onImproveSelection) return text;
    return onImproveSelection(text);
  };

  const handleApply = (text: string) => {
    if (!onApplySelection) return;
    onApplySelection(text);
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col transition-all duration-300",
        isFocusMode && "fixed inset-0 z-50 bg-background"
      )}
    >
      {onImproveSelection && onApplySelection ? (
        <ContextualToolbar onImprove={handleImprove} onApply={handleApply} />
      ) : null}

      <div
        className={cn(
          "flex items-center justify-between border-b border-border/40 bg-background/88 px-4 py-3 backdrop-blur",
          isFocusMode && "mx-auto w-full max-w-5xl border-x"
        )}
      >
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Documento</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Markdown com headings, listas, citações e links.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsFocusMode((value) => !value)}
          className="rounded-full"
        >
          {isFocusMode ? <Minimize2 className="mr-2 h-4 w-4" /> : <Maximize2 className="mr-2 h-4 w-4" />}
          {isFocusMode ? "Sair do foco" : "Modo foco"}
        </Button>
      </div>

      <ScrollArea
        className={cn(
          "flex-1",
          isFocusMode && "mx-auto w-full max-w-5xl border-x"
        )}
      >
        <div className={cn("px-6 py-6 md:px-8 lg:px-12 lg:py-8", isFocusMode && "px-8 py-8 md:px-12")}>
          <input
            type="text"
            value={sectionTitle}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Titulo da seccao"
            className="mb-6 w-full border-none bg-transparent text-3xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/45 md:text-4xl"
          />

          <div className="overflow-hidden rounded-[28px] border border-border/60 bg-background shadow-sm">
            <MDXEditor
              ref={editorRef}
              markdown={content}
              onChange={(nextMarkdown) => {
                lastMarkdownRef.current = nextMarkdown;
                onContentChange(nextMarkdown);
              }}
              contentEditableClassName="prose prose-neutral dark:prose-invert min-h-[460px] max-w-none px-6 py-6 text-[1rem] leading-8 text-foreground prose-headings:tracking-tight prose-headings:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90 prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground prose-strong:text-foreground prose-a:text-primary"
              className="mdx-editor-shell"
              plugins={[
                headingsPlugin({ allowedHeadingLevels: [1, 2, 3] }),
                listsPlugin(),
                quotePlugin(),
                linkPlugin(),
                linkDialogPlugin(),
                markdownShortcutPlugin(),
                toolbarPlugin({
                  toolbarContents: () => (
                    <>
                      <UndoRedo />
                      <Separator />
                      <BlockTypeSelect />
                      <Separator />
                      <BoldItalicUnderlineToggles />
                      <Separator />
                      <ListsToggle />
                      <Separator />
                      <CreateLink />
                    </>
                  ),
                }),
              ]}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
