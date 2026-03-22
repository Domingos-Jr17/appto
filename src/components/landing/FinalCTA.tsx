"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Reveal } from "./animations";

export function FinalCTA() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-primary/10 pointer-events-none" />
      <div className="absolute inset-0 grid-pattern pointer-events-none" />
      
      {/* Glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/15 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
              className="relative p-8 md:p-12 rounded-3xl bg-card/90 backdrop-blur-xl border border-border/50 shadow-2xl overflow-hidden"
            >
              {/* Inner glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />

              <div className="relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30"
                >
                  <Sparkles className="w-8 h-8 text-primary-foreground" />
                </motion.div>

                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                  Pronto para transformar a sua{" "}
                  <span className="text-primary">escrita académica</span>?
                </h2>

                <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                  Junte-se a milhares de estudantes moçambicanos que já descobriram 
                  uma forma mais inteligente de trabalhar nos seus projectos académicos.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    className="h-14 px-10 rounded-xl font-semibold text-base bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 group"
                    asChild
                  >
                    <Link href="/register">
                      Começar Grátis
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-14 px-10 rounded-xl font-semibold text-base border-2 hover:bg-muted/50"
                    onClick={() => {
                      const element = document.querySelector("#precos");
                      if (element) element.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Ver Planos
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground mt-6">
                  Sem cartão de crédito necessário • Comece em segundos
                </p>
              </div>
            </motion.div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
