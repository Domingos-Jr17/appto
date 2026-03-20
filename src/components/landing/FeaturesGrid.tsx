"use client";

import { motion } from "framer-motion";
import { PenTool, LayoutTemplate, Languages, BookMarked, Database, SpellCheck, FileDown, Coins, FolderKanban, Zap, RotateCcw, CreditCard } from "lucide-react";
import { features } from "./data";
import { Reveal, StaggerContainer, StaggerItem } from "./animations";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  PenTool,
  LayoutTemplate,
  Languages,
  BookMarked,
  Database,
  SpellCheck,
  FileDown,
  Coins,
  FolderKanban,
  Zap,
  RotateCcw,
  CreditCard,
};

export function FeaturesGrid() {
  return (
    <section id="recursos" className="py-20 md:py-28 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 grid-pattern pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <Reveal>
          <div className="text-center mb-12 md:mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Recursos Completos
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Tudo o que precisa para{" "}
              <span className="text-primary">trabalhos académicos</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Uma plataforma completa com todas as ferramentas necessárias para criar, 
              estruturar e normalizar os seus trabalhos académicos.
            </p>
          </div>
        </Reveal>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {features.map((feature, index) => {
            const Icon = iconMap[feature.icon] || PenTool;
            return (
              <StaggerItem key={feature.id}>
                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "group relative p-6 rounded-2xl border transition-all duration-300 overflow-hidden",
                    "bg-card/80 backdrop-blur-xl border-border/50 hover:border-primary/30",
                    "shadow-lg hover:shadow-xl hover:-translate-y-0.5",
                    feature.highlight && "ring-1 ring-primary/20 bg-primary/5"
                  )}
                >
                  {/* Background overlay on hover */}
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  
                  <div className="relative z-10">
                    {/* Icon */}
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors",
                      feature.highlight
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted group-hover:bg-primary/10"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <h3 className="text-lg font-semibold mb-2 text-foreground group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>

                    {/* Highlight badge */}
                    {feature.highlight && (
                      <div className="absolute top-4 right-4">
                        <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                          Popular
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}
