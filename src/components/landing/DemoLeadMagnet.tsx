"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Loader2, CheckCircle2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Reveal } from "./animations";

export function DemoLeadMagnet() {
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setIsLoading(true);
    // Simulate generation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(false);
    setShowResult(true);
  };

  return (
    <section id="demo" className="py-20 md:py-28 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl opacity-50 pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="text-center mb-10">
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Wand2 className="w-3.5 h-3.5 inline-block mr-1.5" />
                Experimente Grátis
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                Receba uma <span className="text-primary">estrutura inicial</span> agora
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Digite o tema do seu trabalho e receba uma sugestão de estrutura gratuita. 
                Sem cadastro, sem compromisso.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <motion.div
              whileHover={{ scale: 1.01 }}
              className="relative p-6 md:p-8 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 shadow-xl overflow-hidden"
            >
              {/* Background overlay */}
              <div className="absolute inset-0 bg-primary/5 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />

              {/* Input area */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6 relative z-10">
                <div className="flex-1 relative">
                  <Input
                    type="text"
                    placeholder="Ex: O impacto das mudanças climáticas na agricultura familiar em Moçambique"
                    value={topic}
                    onChange={(e) => {
                      setTopic(e.target.value);
                      setShowResult(false);
                    }}
                    className="h-14 rounded-xl border-border/50 bg-background/50 text-base"
                  />
                </div>
                <Button
                  size="lg"
                  className="h-14 px-8 rounded-xl font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 group"
                  disabled={!topic.trim() || isLoading}
                  onClick={handleGenerate}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      A gerar...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Gerar Estrutura
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </div>

              {/* Result preview */}
              {showResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="p-5 rounded-xl bg-background/50 border border-border/50 relative z-10"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <span className="font-semibold">Estrutura sugerida</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <span className="text-sm font-medium text-primary w-8">1.</span>
                      <div>
                        <p className="font-medium">Introdução</p>
                        <p className="text-sm text-muted-foreground">Contextualização, problemática e objectivos do estudo</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-sm font-medium text-primary w-8">2.</span>
                      <div>
                        <p className="font-medium">Revisão da Literatura</p>
                        <p className="text-sm text-muted-foreground">Mudanças climáticas: conceitos e impactos na agricultura</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-sm font-medium text-primary w-8">3.</span>
                      <div>
                        <p className="font-medium">Metodologia</p>
                        <p className="text-sm text-muted-foreground">Abordagem qualitativa com estudo de caso em Gaza</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-sm font-medium text-primary w-8">4.</span>
                      <div>
                        <p className="font-medium">Resultados e Discussão</p>
                        <p className="text-sm text-muted-foreground">Análise dos dados e comparação com literatura</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-sm font-medium text-primary w-8">5.</span>
                      <div>
                        <p className="font-medium">Conclusões e Recomendações</p>
                        <p className="text-sm text-muted-foreground">Síntese dos achados e propostas de intervenção</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-border/50 flex flex-col sm:flex-row gap-3">
                    <Button
                      className="flex-1 rounded-xl font-semibold bg-primary hover:bg-primary/90"
                      onClick={() => {}}
                    >
                      Continuar no aptto
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl font-semibold"
                      onClick={() => setShowResult(false)}
                    >
                      Tentar outro tema
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Placeholder text */}
              {!showResult && (
                <p className="text-center text-sm text-muted-foreground relative z-10">
                  Sem necessidade de cadastro. Experimente agora mesmo.
                </p>
              )}
            </motion.div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
