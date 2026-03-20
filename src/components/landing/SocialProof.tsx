"use client";

import { motion } from "framer-motion";
import { stats } from "./data";
import { Reveal, StaggerContainer, StaggerItem } from "./animations";
import { Counter } from "./Counter";

export function SocialProof() {
  return (
    <section className="py-16 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <Reveal>
          <div className="text-center mb-10">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Resultados reais de estudantes reais
            </p>
          </div>
        </Reveal>

        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat, index) => (
            <StaggerItem key={index}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="relative p-6 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 shadow-lg hover:shadow-xl text-center overflow-hidden group transition-all"
              >
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <div className="relative z-10">
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-1">
                    {stat.suffix === "+" ? (
                      <>
                        <Counter value={parseInt(stat.value.replace(/\D/g, ""))} />
                        {stat.suffix}
                      </>
                    ) : stat.suffix === "%" ? (
                      <>
                        <Counter value={parseInt(stat.value)} />
                        {stat.suffix}
                      </>
                    ) : stat.suffix === "min" ? (
                      stat.value
                    ) : (
                      stat.value
                    )}
                  </div>
                  <p className="text-sm text-foreground font-medium">
                    {stat.label}
                  </p>
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
