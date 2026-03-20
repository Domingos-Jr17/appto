"use client";

import { motion } from "framer-motion";
import { Globe, BookOpen, Library, GraduationCap, Eye, MapPin } from "lucide-react";
import { differentiators, genericComparison } from "./data";
import { Reveal, StaggerContainer, StaggerItem } from "./animations";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Globe,
  BookOpen,
  Library,
  GraduationCap,
  Eye,
  MapPin,
};

export function DifferentiatorsSection() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-transparent to-muted/30 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <Reveal>
          <div className="text-center mb-12 md:mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 backdrop-blur-xl border border-primary/10 text-primary text-sm font-medium mb-4 shadow-lg shadow-primary/5">
              Porquê o aptto?
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Não é mais uma{" "}
              <span className="text-primary">IA genérica</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              O aptto foi construído especificamente para o contexto académico moçambicano. 
              Não adaptações, não traduções estranhas. É feito para si.
            </p>
          </div>
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto">
          {/* Differentiators grid */}
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {differentiators.map((diff, index) => {
              const Icon = iconMap[diff.icon] || Globe;
              return (
                <StaggerItem key={index}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="p-5 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 hover:border-primary/30 shadow-lg hover:shadow-xl transition-all group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <div className="relative z-10 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1 text-foreground group-hover:text-primary transition-colors">
                          {diff.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {diff.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>

          {/* Comparison table */}
          <Reveal delay={0.2}>
            <motion.div
              whileHover={{ scale: 1.01 }}
              className="p-6 md:p-8 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 shadow-xl relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-primary/5 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="relative z-10">
                <h3 className="text-xl font-semibold mb-6 text-center">
                  Comparação directa
                </h3>
                
                <div className="space-y-3">
                  {/* Header */}
                  <div className="grid grid-cols-3 gap-4 pb-3 border-b border-border">
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

                  {/* Rows */}
                  {genericComparison.map((row, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.05 + 0.3 }}
                      className="grid grid-cols-3 gap-4 py-2 items-center"
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
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-border text-center">
                  <p className="text-sm text-muted-foreground">
                    Feito para Moçambique, por quem entende Moçambique.
                  </p>
                </div>
              </div>
            </motion.div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
