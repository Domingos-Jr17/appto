"use client";

import { motion } from "framer-motion";
import { FolderPlus, Settings, Wand2, Send } from "lucide-react";
import { howItWorksSteps } from "./data";
import { Reveal, StaggerContainer, StaggerItem } from "./animations";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FolderPlus,
  Settings,
  Wand2,
  Send,
};

export function HowItWorks() {
  return (
    <section id="como-funciona" className="py-20 md:py-28 relative overflow-hidden bg-muted/30">
      {/* Background elements */}
      <div className="absolute inset-0 grid-pattern pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <Reveal>
          <div className="text-center mb-12 md:mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Simples e Rápido
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Como funciona o{" "}
              <span className="text-primary">aptto</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Em quatro passos simples, transforme a sua ideia num trabalho académico bem estruturado e normalizado.
            </p>
          </div>
        </Reveal>

        <div className="relative max-w-5xl mx-auto">
          {/* Timeline line - desktop only */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-border pointer-events-none" />

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {howItWorksSteps.map((step, index) => {
              const Icon = iconMap[step.icon] || FolderPlus;
              return (
                <StaggerItem key={step.step}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    className="relative group"
                  >
                    {/* Step number */}
                    <div className="lg:text-center mb-4">
                      <div className="relative inline-flex">
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg",
                            "bg-card border border-border shadow-lg",
                            "group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary",
                            "transition-all duration-300"
                          )}
                        >
                          {step.step}
                        </motion.div>
                      </div>
                    </div>

                    {/* Content card */}
                    <div className="p-5 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 hover:border-primary/30 shadow-lg group-hover:shadow-xl transition-all overflow-hidden relative">
                      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      <div className="relative z-10">
                        <div className="flex items-start gap-4 lg:flex-col lg:items-center lg:text-center">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 lg:hidden">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-2 text-foreground group-hover:text-primary transition-colors">
                              {step.title}
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>
      </div>
    </section>
  );
}
