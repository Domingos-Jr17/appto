"use client";

import { motion } from "framer-motion";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { pricingPlans } from "./data";
import { Button } from "@/components/ui/button";
import { Reveal, StaggerContainer, StaggerItem } from "./animations";
import { cn } from "@/lib/utils";

export function PricingCards() {
  return (
    <section id="precos" className="py-20 md:py-28 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-transparent to-muted/30 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <Reveal>
          <div className="text-center mb-12 md:mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 backdrop-blur-xl border border-primary/10 text-primary text-sm font-medium mb-4 shadow-lg shadow-primary/5">
              Preços Transparentes
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Planos pensados para{" "}
              <span className="text-primary">estudantes</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comece gratuitamente e faça upgrade quando precisar. Sem surpresas, sem taxas escondidas.
            </p>
          </div>
        </Reveal>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {pricingPlans.map((plan) => (
            <StaggerItem key={plan.id}>
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "relative p-6 md:p-8 pt-8 md:pt-10 rounded-2xl border transition-all duration-300",
                  "bg-card/80 backdrop-blur-xl shadow-lg",
                  plan.highlighted
                    ? "border-primary/50 shadow-xl shadow-primary/10 ring-1 ring-primary/20"
                    : "border-border/50 hover:border-primary/30 hover:shadow-xl"
                )}
              >
                {/* Background overlay */}
                <div className="absolute inset-0 bg-primary/5 opacity-0 hover:opacity-100 transition-opacity pointer-events-none rounded-2xl" />

                {/* Popular badge */}
                {plan.badge && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-lg shadow-primary/30 backdrop-blur-xl">
                      <Sparkles className="w-3.5 h-3.5" />
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="relative z-10">
                  {/* Plan header */}
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl md:text-5xl font-bold text-foreground">
                        {plan.price.toLocaleString("pt-MZ")}
                      </span>
                      <span className="text-muted-foreground font-medium">
                        {plan.currency}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {plan.period}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {plan.description}
                    </p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li
                        key={featureIndex}
                        className="flex items-start gap-2.5 text-sm"
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                          plan.highlighted
                            ? "bg-primary text-primary-foreground"
                            : "bg-primary/10 text-primary"
                        )}>
                          <Check className="w-3 h-3" />
                        </div>
                        <span className="text-foreground/80">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button
                    asChild
                    className={cn(
                      "w-full rounded-xl font-semibold group",
                      plan.highlighted
                        ? "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                        : "bg-muted hover:bg-muted/80 text-foreground"
                    )}
                  >
                    <Link href="/register" className="inline-flex items-center justify-center gap-2">
                      {plan.cta}
                      <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </Link>
                  </Button>
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Note about credits */}
        <Reveal delay={0.4}>
          <p className="text-center text-sm text-muted-foreground mt-8 max-w-2xl mx-auto">
            Precisa de mais créditos? Também oferecemos pacotes de créditos avulsos a partir de 100 MZN. 
            Perfeito para quando precisa de um extra sem compromisso mensal.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
