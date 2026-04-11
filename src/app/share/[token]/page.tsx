"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, FileText, ExternalLink, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SharedDocumentData {
  title: string;
  type: string;
  description: string | null;
  brief: {
    institutionName?: string | null;
    studentName?: string | null;
    advisorName?: string | null;
    courseName?: string | null;
    city?: string | null;
    academicYear?: number | null;
  } | null;
  sections: {
    id: string;
    title: string;
    content: string;
    order: number;
    level: 1 | 2;
  }[];
  frontMatterSections: {
    id: string;
    title: string;
    content: string;
    order: number;
    level: 1 | 2;
  }[];
  references: {
    status: string;
    content: string;
  };
  sharedAt: string;
  views: number;
}

function parseMarkdownBlocks(content: string) {
  const lines = content.split("\n");
  const blocks: Array<{ type: string; text?: string; items?: string[] }> = [];
  let currentBlock: typeof blocks[number] | null = null;
  let listItems: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "") {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      if (listItems.length > 0) {
        blocks.push({ type: "list", items: [...listItems] });
        listItems = [];
      }
      continue;
    }

    if (trimmed.startsWith("#")) {
      if (currentBlock) blocks.push(currentBlock);
      if (listItems.length > 0) {
        blocks.push({ type: "list", items: [...listItems] });
        listItems = [];
      }
      currentBlock = { type: "heading", text: trimmed.replace(/^#+\s*/, "") };
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      listItems.push(trimmed.replace(/^[-*]\s+/, ""));
    } else if (trimmed.startsWith(">")) {
      if (currentBlock) blocks.push(currentBlock);
      currentBlock = { type: "quote", text: trimmed.replace(/^>\s*/, "") };
    } else {
      if (currentBlock && currentBlock.type === "paragraph") {
        currentBlock.text += "\n" + trimmed;
      } else {
        if (currentBlock) blocks.push(currentBlock);
        if (listItems.length > 0) {
          blocks.push({ type: "list", items: [...listItems] });
          listItems = [];
        }
        currentBlock = { type: "paragraph", text: trimmed };
      }
    }
  }

  if (currentBlock) blocks.push(currentBlock);
  if (listItems.length > 0) {
    blocks.push({ type: "list", items: listItems });
  }

  return blocks;
}

function MarkdownRenderer({ content }: { content: string }) {
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        if (block.type === "heading" && block.text) {
          return (
            <h3 key={index} className="text-lg font-semibold text-foreground mt-4 mb-2">
              {block.text}
            </h3>
          );
        }

        if (block.type === "paragraph" && block.text) {
          return (
            <p key={index} className="text-sm text-muted-foreground leading-relaxed">
              {block.text}
            </p>
          );
        }

        if (block.type === "quote" && block.text) {
          return (
            <blockquote key={index} className="border-l-4 border-primary pl-4 italic text-sm text-muted-foreground">
              {block.text}
            </blockquote>
          );
        }

        if (block.type === "list" && block.items) {
          return (
            <ul key={index} className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ul>
          );
        }

        return null;
      })}
    </div>
  );
}

export default function SharedDocumentPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<SharedDocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then(p => setToken(p.token));
  }, [params]);

  useEffect(() => {
    async function fetchSharedDocument() {
      try {
        const res = await fetch(`/api/share/${token}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Documento não encontrado");
        }
        const json = await res.json();
        setData(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar documento");
      } finally {
        setLoading(false);
      }
    }

    fetchSharedDocument();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-muted/30">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">A carregar documento...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-muted/30">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Documento não encontrado</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              {error || "Este documento pode ter sido removido ou o link expirou."}
            </p>
            <Link href="/">
              <Button>
                <ExternalLink className="h-4 w-4 mr-2" />
                Voltar ao início
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/30">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/70 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg font-semibold text-foreground">{data.title}</h1>
              <p className="text-xs text-muted-foreground">{data.type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              <Eye className="h-3 w-3 mr-1" />
              {data.views}
            </Badge>
            <Link href="/auth/register">
              <Button size="sm" className="hidden sm:flex">
                Criar conta grátis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Cover Info */}
        {data.brief && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Informações do Trabalho</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {data.brief.institutionName && (
                <div>
                  <span className="font-medium text-foreground">Instituição:</span>
                  <p className="text-muted-foreground">{data.brief.institutionName}</p>
                </div>
              )}
              {data.brief.studentName && (
                <div>
                  <span className="font-medium text-foreground">Autor:</span>
                  <p className="text-muted-foreground">{data.brief.studentName}</p>
                </div>
              )}
              {data.brief.advisorName && (
                <div>
                  <span className="font-medium text-foreground">Orientador:</span>
                  <p className="text-muted-foreground">{data.brief.advisorName}</p>
                </div>
              )}
              {data.brief.courseName && (
                <div>
                  <span className="font-medium text-foreground">Curso:</span>
                  <p className="text-muted-foreground">{data.brief.courseName}</p>
                </div>
              )}
              {data.brief.city && (
                <div>
                  <span className="font-medium text-foreground">Local:</span>
                  <p className="text-muted-foreground">
                    {data.brief.city}{data.brief.academicYear ? `, ${data.brief.academicYear}` : ""}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Description */}
        {data.description && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{data.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Front Matter Sections */}
        {data.frontMatterSections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <MarkdownRenderer content={section.content} />
            </CardContent>
          </Card>
        ))}

        {/* Main Sections */}
        {data.sections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <MarkdownRenderer content={section.content} />
            </CardContent>
          </Card>
        ))}

        {/* References */}
        {data.references.content && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Referências</CardTitle>
            </CardHeader>
            <CardContent>
              <MarkdownRenderer content={data.references.content} />
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            Cria o teu próprio trabalho académico com o aptto
          </p>
          <Link href="/auth/register">
            <Button size="lg">
              <ExternalLink className="h-4 w-4 mr-2" />
              Começar Grátis
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
