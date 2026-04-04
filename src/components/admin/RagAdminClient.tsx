"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Database, FileText, RefreshCcw, Search, Upload, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ingestionMode, setIngestionMode] = useState<"text" | "file">("text");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function ingestFile() {
    if (!selectedSourceId || !documentTitle.trim() || !selectedFile) return;

    setIsSubmitting(true);
    try {
      const fileBase64 = await fileToBase64(selectedFile);
      const response = await fetch("/api/admin/rag/ingest-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: selectedSourceId,
          title: documentTitle,
          fileBase64,
          mimeType: selectedFile.type,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Não foi possível ingerir o ficheiro.");
      }

      toast({ title: "Ficheiro indexado", description: `Documento ${data.document.title} foi extraído e indexado.` });
      setDocumentTitle("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await refreshSources();
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível indexar o ficheiro.",
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

            <div className="flex gap-2">
              <Button
                type="button"
                variant={ingestionMode === "text" ? "default" : "outline"}
                size="sm"
                onClick={() => setIngestionMode("text")}
              >
                <FileText className="mr-1 h-3.5 w-3.5" /> Texto
              </Button>
              <Button
                type="button"
                variant={ingestionMode === "file" ? "default" : "outline"}
                size="sm"
                onClick={() => setIngestionMode("file")}
              >
                <Upload className="mr-1 h-3.5 w-3.5" /> Ficheiro
              </Button>
            </div>

            {ingestionMode === "text" ? (
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
            ) : (
              <div className="space-y-2">
                <Label>Ficheiro</Label>
                {selectedFile ? (
                  <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm">{selectedFile.name}</span>
                    <span className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                    <button type="button" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border/60 p-6 text-center">
                    <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">PDF, DOCX ou TXT até 25 MB</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.doc,.txt"
                      className="mt-2 cursor-pointer text-sm"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file && ALLOWED_MIME_TYPES.includes(file.type)) {
                          setSelectedFile(file);
                        } else if (file) {
                          toast({ title: "Formato inválido", description: "Apenas PDF, DOCX e TXT são aceites.", variant: "destructive" });
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {ingestionMode === "text" ? (
              <Button
                type="button"
                onClick={() => void ingestDocument()}
                disabled={isSubmitting || !selectedSourceId || !documentTitle.trim() || !documentContent.trim()}
              >
                Indexar documento
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => void ingestFile()}
                disabled={isSubmitting || !selectedSourceId || !documentTitle.trim() || !selectedFile}
              >
                Indexar ficheiro
              </Button>
            )}
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
