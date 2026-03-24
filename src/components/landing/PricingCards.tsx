"use client";

import { motion } from "framer-motion";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Plano Gratuito",
    price: "0",
    currency: "MZN",
    period: "para sempre",
    description: "Perfeito para experimentar o aptto",
    features: [
      { text: "150 créditos", included: true },
      { text: "3 gerações/dia", included: true },
      { text: "1 exportação com marca de água", included: true },
      { text: "Exportação ilimitada", included: false },
    ],
    cta: "Começar Grátis",
    highlighted: false,
  },
  {
    name: "Plano Estudante",
    price: "350",
    currency: "MZN",
    period: "/mês",
    description: "Ideal para trabalhos académicos regulares",
    features: [
      { text: "12.000 créditos", included: true },
      { text: "Exportação DOCX", included: true },
      { text: "Sem marca de água", included: true },
      { text: "Modelos avançados", included: false },
    ],
    cta: "Escolher Estudante",
    highlighted: true,
    badge: "Mais Popular",
  },
  {
    name: "Plano Académico",
    price: "900",
    currency: "MZN",
    period: "/mês",
    description: "Para equipas e utilizadores intensivos em fase piloto",
    features: [
      { text: "60.000 créditos", included: true },
      { text: "Fluxo de projeto avançado", included: true },
      { text: "Modelos avançados", included: true },
      { text: "Sem limites diários", included: true },
      { text: "Suporte prioritário", included: true },
    ],
    cta: "Escolher Académico",
    highlighted: false,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.4, 0.25, 1] as const,
    },
  },
};

const featureVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
    },
  }),
};

export function PricingCards() {
  return (
    <section id="precos" className="py-24 px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-transparent to-muted/30 pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none"
      />
      
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Planos que <span className="text-primary">cabem no seu bolso</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Comece gratuitamente e evolua conforme suas necessidades académicas
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
        >
          {plans.map((plan, planIndex) => (
            <motion.div
              key={plan.name}
              variants={cardVariants}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
              className={cn(
                "relative",
                plan.highlighted && "md:-mt-4 md:mb-4"
              )}
            >
              {/* Highlighted card glow effect */}
              {plan.highlighted && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute -inset-1 bg-gradient-to-r from-primary via-primary/80 to-primary rounded-3xl blur-xl"
                />
              )}
              
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <Card
                  className={cn(
                    "relative h-full transition-all duration-500 bg-card/80 backdrop-blur-xl cursor-pointer",
                    plan.highlighted
                      ? "border-primary/50 shadow-2xl shadow-primary/20 bg-gradient-to-b from-primary/5 to-card"
                      : "border-border/50 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5"
                  )}
                >
                  {/* Popular Badge */}
                  {plan.badge && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                      className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg shadow-primary/30 backdrop-blur-xl"
                      >
                        <motion.span
                          animate={{ rotate: [0, 15, -15, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </motion.span>
                        {plan.badge}
                      </motion.div>
                    </motion.div>
                  )}

                  <CardHeader className="text-center pb-2 pt-6">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Price with animation */}
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: planIndex * 0.1 + 0.3 }}
                      className="text-center"
                    >
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold text-primary">
                          {plan.price}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          {plan.currency}{plan.period}
                        </span>
                      </div>
                    </motion.div>

                    {/* Features with stagger animation */}
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <motion.li
                          key={feature.text}
                          custom={i}
                          variants={featureVariants}
                          initial="hidden"
                          whileInView="visible"
                          viewport={{ once: true }}
                          transition={{ delay: planIndex * 0.1 + i * 0.05 }}
                          className={cn(
                            "flex items-center gap-3 text-sm transition-colors duration-200",
                            feature.included
                              ? "text-foreground"
                              : "text-muted-foreground/50"
                          )}
                        >
                          <motion.div
                            whileHover={{ scale: 1.2 }}
                            className={cn(
                              "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center backdrop-blur-xl border transition-colors duration-200",
                              feature.included
                                ? "bg-primary/10 border-primary/10 group-hover:bg-primary/20"
                                : "bg-muted/50 border-border/30"
                            )}
                          >
                            <Check
                              className={cn(
                                "w-3 h-3",
                                feature.included
                                  ? "text-primary"
                                  : "text-muted-foreground/30"
                              )}
                            />
                          </motion.div>
                          <span className={cn(!feature.included && "line-through")}>
                            {feature.text}
                          </span>
                        </motion.li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full"
                    >
                      <Button
                        asChild
                        className={cn(
                          "w-full group relative overflow-hidden",
                          plan.highlighted
                            ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
                            : "bg-muted hover:bg-muted/80 text-foreground"
                        )}
                        size="lg"
                      >
                        <Link href="/register" className="inline-flex items-center justify-center gap-2">
                          {plan.highlighted && (
                            <motion.span
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                              animate={{ x: ['-100%', '100%'] }}
                              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                            />
                          )}
                          <span className="relative">{plan.cta}</span>
                          <motion.span
                            className="relative"
                            initial={{ opacity: 0, x: -10 }}
                            whileHover={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ArrowRight className="w-4 h-4" />
                          </motion.span>
                        </Link>
                      </Button>
                    </motion.div>
                  </CardFooter>
                </Card>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-muted-foreground">
            Cobrança ainda em validação operacional • sem promessas públicas de pagamento móvel até integração real
          </p>
        </motion.div>
      </div>
    </section>
  );
}

export default PricingCards;
