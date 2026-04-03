"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Database, RefreshCcw, Search, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface RagSourceRecord {
  id: string;
  name: string;
  slug: string;
  type: "PUBLIC" | "INSTITUTIONAL" | "PRIVATE";
  isActive: boolean;
  _count?: { documents: number };
}

interface RagSearchResult {
  sourceName: string;
  documentTitle: string;
  chunkIndex: number;
  content: string;
  score?: number;
}

export function RagAdminClient() {
  const { toast } = useToast();
  const [sources, setSources] = useState<RagSourceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sourceName, setSourceName] = useState("");
  const [sourceType, setSourceType] = useState<RagSourceRecord["type"]>("PUBLIC");
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentContent, setDocumentContent] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RagSearchResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refreshSources = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/rag/sources");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Não foi possível carregar as fontes.");
      }
      setSources(data.sources || []);
      if (data.sources?.[0]?.id) {
        setSelectedSourceId((current) => current || data.sources[0].id);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível carregar as fontes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void refreshSources();
  }, [refreshSources]);

  const sourceOptions = useMemo(() => sources.map((source) => ({ value: source.id, label: source.name })), [sources]);

  async function createSource() {
    if (!sourceName.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/rag/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: sourceName, type: sourceType }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Não foi possível criar a fonte.");
      }

      toast({ title: "Fonte criada", description: `Fonte ${data.source.name} adicionada ao catálogo.` });
      setSourceName("");
      await refreshSources();
      setSelectedSourceId(data.source.id);
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível criar a fonte.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function ingestDocument() {
    if (!selectedSourceId || !documentTitle.trim() || !documentContent.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/rag/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: selectedSourceId,
          title: documentTitle,
          content: documentContent,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Não foi possível ingerir o documento.");
      }

      toast({ title: "Documento indexado", description: `Documento ${data.document.title} foi dividido e indexado.` });
      setDocumentTitle("");
      setDocumentContent("");
      await refreshSources();
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível indexar o documento.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function runSearch() {
    if (!searchQuery.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/rag/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, limit: 5 }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Não foi possível executar a pesquisa.");
      }

      setSearchResults(data.results || []);
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível executar a pesquisa.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin RAG</h1>
          <p className="text-sm text-muted-foreground">
            Gere fontes, indexe documentos e valide rapidamente o contexto recuperado pela IA.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void refreshSources()}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="h-4 w-4" /> Fontes registadas</CardTitle>
            <CardDescription>
              Catálogo de fontes públicas, institucionais ou privadas disponíveis para o RAG.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">A carregar fontes...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fonte</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Documentos</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sources.map((source) => (
                    <TableRow key={source.id}>
                      <TableCell>
                        <div className="font-medium">{source.name}</div>
                        <div className="text-xs text-muted-foreground">{source.slug}</div>
                      </TableCell>
                      <TableCell>{source.type}</TableCell>
                      <TableCell>{source._count?.documents || 0}</TableCell>
                      <TableCell>
                        <Badge variant={source.isActive ? "default" : "secondary"}>
                          {source.isActive ? "Activa" : "Inactiva"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Criar nova fonte</CardTitle>
            <CardDescription>Registe rapidamente uma nova origem de conhecimento para ingestão.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rag-source-name">Nome da fonte</Label>
              <Input id="rag-source-name" value={sourceName} onChange={(event) => setSourceName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rag-source-type">Tipo</Label>
              <select
                id="rag-source-type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={sourceType}
                onChange={(event) => setSourceType(event.target.value as RagSourceRecord["type"])}
              >
                <option value="PUBLIC">PUBLIC</option>
                <option value="INSTITUTIONAL">INSTITUTIONAL</option>
                <option value="PRIVATE">PRIVATE</option>
              </select>
            </div>
            <Button type="button" onClick={() => void createSource()} disabled={isSubmitting || !sourceName.trim()}>
              Criar fonte
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Upload className="h-4 w-4" /> Ingerir documento</CardTitle>
            <CardDescription>
              Indexe conteúdo textual para o RAG. Use fontes curadas e específicas por projecto ou domínio.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rag-source-select">Fonte</Label>
              <select
                id="rag-source-select"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedSourceId}
                onChange={(event) => setSelectedSourceId(event.target.value)}
              >
                <option value="">Seleccione uma fonte</option>
                {sourceOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rag-document-title">Título do documento</Label>
              <Input id="rag-document-title" value={documentTitle} onChange={(event) => setDocumentTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rag-document-content">Conteúdo</Label>
              <Textarea
                id="rag-document-content"
                rows={12}
                value={documentContent}
                onChange={(event) => setDocumentContent(event.target.value)}
                placeholder="Cole aqui o texto limpo do documento, lei, relatório ou tese..."
              />
            </div>
            <Button
              type="button"
              onClick={() => void ingestDocument()}
              disabled={isSubmitting || !selectedSourceId || !documentTitle.trim() || !documentContent.trim()}
            >
              Indexar documento
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Search className="h-4 w-4" /> Testar pesquisa</CardTitle>
            <CardDescription>
              Execute uma pesquisa manual para validar se o RAG está a recuperar trechos relevantes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rag-search-query">Consulta</Label>
              <Textarea
                id="rag-search-query"
                rows={4}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Ex.: políticas públicas de ensino superior em Moçambique"
              />
            </div>
            <Button type="button" variant="outline" onClick={() => void runSearch()} disabled={isSubmitting || !searchQuery.trim()}>
              Executar pesquisa
            </Button>

            <div className="space-y-3">
              {searchResults.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum resultado ainda.</p>
              ) : (
                searchResults.map((result, index) => (
                  <div key={`${result.documentTitle}-${index}`} className="rounded-xl border border-border/60 p-3">
                    <div className="text-sm font-medium">{result.documentTitle}</div>
                    <div className="text-xs text-muted-foreground">
                      {result.sourceName} • trecho {result.chunkIndex + 1}
                      {typeof result.score === "number" ? ` • score ${result.score.toFixed(3)}` : ""}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{result.content}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
