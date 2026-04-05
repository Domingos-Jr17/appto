"use client";

import { Check, X } from "lucide-react";
import { Reveal } from "./animations";
import { genericComparison } from "./data";
import { cn } from "@/lib/utils";

const coreFeatures = [
  {
    title: "Entrega sem noites em claro",
    description:
      "Estrutura automática para trabalhos de investigação. Começas com um tema, recebes um documento organizado.",
  },
  {
    title: "Formatado como o teu orientador espera",
    description:
      "Referências, capas e sumários com normas ABNT. O teu trabalho sai pronto para submissão — sem ajustes manuais.",
  },
  {
    title: "Português de Moçambique, não de chatbot",
    description:
      "Texto académico em português moçambicano. Sem brasileirismos, sem linguagem genérica de IA.",
  },
  {
    title: "Descarrega e entrega",
    description:
      "Exporta em DOCX em todos os planos e em PDF no PRO. Sem conversões, sem formatações perdidas.",
  },
];

export function FeaturesGrid() {
  return (
    <section id="recursos" className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <Reveal>
          <div className="text-center mb-12 md:mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Porquê o aptto
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              O que a IA genérica{" "}
              <span className="text-primary">não faz por ti</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              O ChatGPT não conhece as normas da UEM, não escreve em português de Moçambique e não exporta um documento formatado. O aptto sim.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
          {coreFeatures.map((feature, index) => (
            <div
              key={index}
              className={cn(
                "p-6 rounded-2xl border bg-card/80 backdrop-blur-xl",
                "hover:border-primary/30 transition-colors"
              )}
            >
              <h3 className="text-lg font-semibold mb-2 text-foreground">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <Reveal>
          <div className="max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold mb-6 text-center">
              aptto vs IA Genérica
            </h3>
            <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl overflow-hidden">
              <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-border bg-muted/30">
                <div className="text-sm font-medium text-muted-foreground">
                  Funcionalidade
                </div>
                <div className="text-center">
                  <span className="inline-block px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                    aptto
                  </span>
                </div>
                <div className="text-center">
                  <span className="inline-block px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm font-medium">
                    IA Genérica
                  </span>
                </div>
              </div>

              <div className="divide-y divide-border/50">
                {genericComparison.map((row, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-3 gap-4 px-6 py-3 items-center"
                  >
                    <div className="text-sm text-foreground/80">
                      {row.feature}
                    </div>
                    <div className="flex justify-center">
                      {row.aptto ? (
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <Check className="w-4 h-4 text-primary" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                          <X className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex justify-center">
                      {row.generic ? (
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <Check className="w-4 h-4 text-primary" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                          <X className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
