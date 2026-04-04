"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, ChevronRight, Clock, FileText, Sparkles } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { DemoOutline } from "@/lib/demo-outline";

type DemoState = "idle" | "generating" | "success" | "error";
type DemoSource = "real" | "fallback" | null;

const initialOutline: DemoOutline = {
  title: "",
  sections: [],
  stats: {
    pages: "",
    references: "",
    time: "",
  },
};

export function DemoLeadMagnet() {
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<DemoState>("idle");
  const [outline, setOutline] = useState<DemoOutline>(initialOutline);
  const [source, setSource] = useState<DemoSource>(null);
  const [error, setError] = useState("");

  const canSubmit = topic.trim().length >= 8 && topic.trim().length <= 160;
  const showResult = status === "success";

  const resultBadge = useMemo(() => {
    if (source === "real") {
      return {
        label: "Gerado pela IA",
        className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      };
    }

    if (source === "fallback") {
      return {
        label: "Demo de fallback",
        className: "bg-amber-500/10 text-amber-700 border-amber-500/20",
      };
    }

    return null;
  }, [source]);

  const handleGenerate = async () => {
    if (!canSubmit) return;

    setStatus("generating");
    setError("");

    try {
      const response = await fetch("/api/demo/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Não foi possível gerar o sumário.");
      }

      setOutline(data.outline);
      setSource(data.source);
      setStatus("success");
    } catch (requestError) {
      setStatus("error");
      setSource(null);
      setOutline(initialOutline);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível gerar o sumário neste momento."
      );
    }
  };

  return (
    <section id="demo" className="relative overflow-hidden px-4 py-24">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/10" />
      <div className="pointer-events-none absolute inset-0 grid-pattern" />

      <div className="relative z-10 mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary shadow-lg shadow-primary/5 backdrop-blur-xl">
            <Clock className="h-4 w-4" />
            Experimente em 30 segundos
          </div>
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Veja o <span className="text-primary">aptto em acção</span>
          </h2>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            Introduz o tema do teu trabalho e recebes um sumário estruturado instantaneamente
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="overflow-hidden border-border/50 bg-card/80 shadow-xl backdrop-blur-xl">
            <CardContent className="p-0">
              <div className="bg-gradient-to-b from-primary/5 to-transparent p-6 md:p-8">
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="flex-1">
                    <label className="mb-2 block text-sm font-medium">Tema do trabalho</label>
                    <Input
                      placeholder="Ex: Impacto das mudanças climáticas na agricultura..."
                      value={topic}
                      onChange={(event) => setTopic(event.target.value)}
                      className="h-12 border-border/50 bg-background/50 text-base backdrop-blur-xl focus:border-primary/50"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Entre 8 e 160 caracteres. Esta demo não cria conta nem projecto.
                    </p>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => void handleGenerate()}
                      disabled={!canSubmit || status === "generating"}
                      className="h-12 px-8 text-primary-foreground shadow-lg shadow-primary/25"
                    >
                      {status === "generating" ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Sparkles className="mr-2 h-4 w-4" />
                          </motion.div>
                          A gerar...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Gerar sumário grátis
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {showResult ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border/50 p-6 md:p-8">
                      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-500/10 bg-emerald-500/10 backdrop-blur-xl">
                            <FileText className="h-4 w-4 text-emerald-600" />
                          </div>
                          <span className="font-medium">Sumário gerado</span>
                        </div>

                        {resultBadge ? (
                          <Badge variant="outline" className={resultBadge.className}>
                            {resultBadge.label}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-center text-lg font-semibold md:text-left">
                          {outline.title}
                        </h3>

                        <div className="space-y-3">
                          {outline.sections.map((section) => (
                            <div key={`${section.number}-${section.title}`} className="group">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/10 bg-primary/10 text-xs text-primary backdrop-blur-xl">
                                  {section.number}
                                </span>
                                {section.title}
                              </div>
                              <ul className="ml-8 mt-1.5 space-y-1">
                                {section.subsections.map((subsection) => (
                                  <li
                                    key={subsection}
                                    className="flex items-center gap-2 text-sm text-muted-foreground"
                                  >
                                    <ChevronRight className="h-3 w-3 text-primary" />
                                    {subsection}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-4 border-t border-border/50 pt-4">
                          <div className="flex items-center gap-2 text-sm">
                            <BookOpen className="h-4 w-4 text-primary" />
                            <span>{outline.stats.pages} páginas</span>
                          </div>
                          {outline.stats.references ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <FileText className="h-4 w-4 text-primary" />
                              <span>{outline.stats.references}</span>
                            </div>
                          ) : null}
                          {outline.stats.time ? (
                            <div className="flex items-center gap-2 text-sm text-emerald-600">
                              <Clock className="h-4 w-4" />
                              <span>{outline.stats.time}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-6 rounded-xl border border-primary/10 bg-primary/5 p-4 text-center backdrop-blur-xl">
                        <p className="mb-3 text-sm text-muted-foreground">
                          Gostaste? Cria a tua conta gratuita para continuares no editor completo.
                        </p>
                        <Button asChild className="text-primary-foreground shadow-lg shadow-primary/25">
                          <Link href="/register">Criar conta grátis</Link>
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-t border-border/50 p-8"
                  >
                    <div className="text-center text-muted-foreground">
                      <FileText className="mx-auto mb-3 h-12 w-12 opacity-30" />
                      <p className="text-sm">
                        {status === "error" ? error : "O sumário aparecerá aqui após a geração"}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-6 text-center text-sm text-muted-foreground"
        >
          Sem registo necessário para esta demonstração • Os seus dados não são guardados
        </motion.p>
      </div>
    </section>
  );
}

export default DemoLeadMagnet;
