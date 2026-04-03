"use client";

import { ArrowRight, Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trustIndicators } from "./data";
import { useTypewriter, Reveal } from "./animations";
import { ProductMockup } from "./ProductMockup";

const typewriterWords = ["inteligente", "académico", "moçambicano", "confiável"];

export function HeroSection() {
  const typedWord = useTypewriter(typewriterWords, 80, 40, 2000);

  return (
    <section className="relative min-h-screen flex items-center pt-28 pb-16 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 grid-pattern" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-slow delay-1000" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left Content */}
          <div className="flex flex-col items-start gap-6 max-w-2xl">
            {/* Badge */}
            <Reveal>
              <Badge
                variant="outline"
                className="px-4 py-1.5 text-sm font-medium border-primary/20 bg-primary/5 backdrop-blur-xl text-primary rounded-full shadow-lg shadow-primary/5"
              >
                <Sparkles className="w-3.5 h-3.5 mr-2" />
                Feito para estudantes universitários
              </Badge>
            </Reveal>

            {/* Headline */}
            <Reveal delay={0.1}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                O seu copiloto{" "}
                <span className="relative inline-flex min-h-[1.2em] min-w-[8ch] items-end sm:min-w-[10ch]">
                  <span className="inline-block whitespace-nowrap text-primary">
                    {typedWord}
                  </span>
                  <span className="absolute -right-1 top-0 w-0.5 h-full bg-primary animate-pulse" />
                </span>
                <br />
                para trabalhos académicos
              </h1>
            </Reveal>

            {/* Subtitle */}
            <Reveal delay={0.2}>
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-lg">
                Estruture, escreva e normalize os seus trabalhos com assistência inteligente. 
                Português académico moçambicano, referências ABNT e exportação pronta para submissão.
              </p>
            </Reveal>

            {/* CTAs */}
            <Reveal delay={0.3}>
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Button
                  size="lg"
                  className="rounded-xl font-semibold px-8 py-6 text-base bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 group"
                  asChild
                >
                  <Link href="/register">
                    Começar Grátis
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-xl font-semibold px-8 py-6 text-base border-2 hover:bg-muted/50"
                  onClick={() => {
                    const element = document.querySelector("#como-funciona");
                    if (element) element.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Ver Como Funciona
                </Button>
              </div>
            </Reveal>

            {/* Trust Indicators */}
            <Reveal delay={0.4}>
              <div className="flex flex-wrap gap-3 pt-2">
                {trustIndicators.map((indicator, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground"
                  >
                    <Check className="w-4 h-4 text-primary" />
                    <span>{indicator.label}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Right Content - Product Mockup */}
          <Reveal delay={0.2} variants={{ hidden: { opacity: 0, x: 50 }, visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.25, 0.4, 0.25, 1] } } }}>
            <div className="relative">
              <ProductMockup />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
