"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, FileText, ChevronRight, Clock, BookOpen } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const mockOutline = {
  title: "Impacto das Mudanças Climáticas na Agricultura de Subsistência em Moçambique",
  sections: [
    {
      number: "1",
      title: "Introdução",
      subsections: ["1.1 Contextualização do problema", "1.2 Objectivos do estudo", "1.3 Metodologia utilizada"],
    },
    {
      number: "2",
      title: "Revisão da Literatura",
      subsections: ["2.1 Mudanças climáticas: conceitos e teorias", "2.2 Agricultura de subsistência em Moçambique", "2.3 Estudos anteriores"],
    },
    {
      number: "3",
      title: "Metodologia",
      subsections: ["3.1 Tipo de pesquisa", "3.2 Colecta de dados", "3.3 Análise e interpretação"],
    },
    {
      number: "4",
      title: "Resultados e Discussão",
      subsections: ["4.1 Efeitos observados nas culturas", "4.2 Adaptação dos agricultores", "4.3 Análise comparativa"],
    },
    {
      number: "5",
      title: "Conclusões e Recomendações",
      subsections: ["5.1 Principais conclusões", "5.2 Recomendações para políticas públicas", "5.3 Sugestões para pesquisas futuras"],
    },
  ],
  stats: {
    pages: "15-20",
    references: "12-15 fontes locais",
    time: "Poupe 3 horas de pesquisa",
  },
};

export function DemoLeadMagnet() {
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const handleGenerate = () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    // Simulate generation
    setTimeout(() => {
      setIsGenerating(false);
      setShowResult(true);
    }, 1500);
  };

  return (
    <section id="demo" className="py-24 px-4 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/10 pointer-events-none" />
      <div className="absolute inset-0 grid-pattern pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 backdrop-blur-xl border border-primary/10 text-primary text-sm font-medium mb-4 shadow-lg shadow-primary/5">
            <Clock className="w-4 h-4" />
            Experimente em 30 segundos
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Veja o <span className="text-primary">aptto em acção</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Digite o tema do seu trabalho e receba um sumário estruturado instantaneamente
          </p>
        </motion.div>

        {/* Demo Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="border-border/50 backdrop-blur-xl shadow-xl overflow-hidden bg-card/80">
            <CardContent className="p-0">
              {/* Input Section */}
              <div className="p-6 md:p-8 bg-gradient-to-b from-primary/5 to-transparent">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-2">
                      Tema do trabalho
                    </label>
                    <Input
                      placeholder="Ex: Impacto das mudanças climáticas na agricultura..."
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="h-12 text-base border-border/50 bg-background/50 backdrop-blur-xl focus:border-primary/50"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleGenerate}
                      disabled={!topic.trim() || isGenerating}
                      className="h-12 px-8 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg shadow-primary/25"
                    >
                      {isGenerating ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                          </motion.div>
                          A gerar...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Gerar sumário grátis
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Result Preview */}
              <AnimatePresence>
                {showResult && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 md:p-8 border-t border-border/50">
                      {/* Result Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/10 backdrop-blur-xl border border-emerald-500/10 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-emerald-600" />
                          </div>
                          <span className="font-medium">Sumário gerado</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Baseado em {mockOutline.stats.references}
                        </span>
                      </div>

                      {/* Outline Content */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-center md:text-left">
                          {mockOutline.title}
                        </h3>

                        <div className="space-y-3">
                          {mockOutline.sections.map((section) => (
                            <div key={section.number} className="group">
                              <div className="flex items-center gap-2 font-medium text-sm">
                                <span className="w-6 h-6 rounded-full bg-primary/10 backdrop-blur-xl border border-primary/10 flex items-center justify-center text-primary text-xs">
                                  {section.number}
                                </span>
                                {section.title}
                              </div>
                              <ul className="ml-8 mt-1.5 space-y-1">
                                {section.subsections.map((sub) => (
                                  <li
                                    key={sub}
                                    className="flex items-center gap-2 text-sm text-muted-foreground"
                                  >
                                    <ChevronRight className="w-3 h-3 text-primary" />
                                    {sub}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>

                        {/* Stats */}
                        <div className="flex flex-wrap gap-4 pt-4 border-t border-border/50">
                          <div className="flex items-center gap-2 text-sm">
                            <BookOpen className="w-4 h-4 text-primary" />
                            <span>{mockOutline.stats.pages} páginas</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-emerald-600">
                            <Clock className="w-4 h-4" />
                            <span>{mockOutline.stats.time}</span>
                          </div>
                        </div>
                      </div>

                      {/* CTA */}
                      <div className="mt-6 p-4 rounded-xl bg-primary/5 backdrop-blur-xl border border-primary/10 text-center">
                        <p className="text-sm text-muted-foreground mb-3">
                          Gostou? Crie sua conta gratuita para continuar
                        </p>
                        <Button asChild className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg shadow-primary/25">
                          <Link href="/register">
                            Criar conta grátis
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Placeholder when no result */}
              {!showResult && (
                <div className="p-8 border-t border-border/50">
                  <div className="text-center text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">
                      O sumário aparecerá aqui após a geração
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Trust Note */}
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
