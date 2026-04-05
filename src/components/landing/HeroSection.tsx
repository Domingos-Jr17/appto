"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTypewriter, Reveal } from "./animations";

const words = ["estruturado", "formatado", "submetido", "aprovado"];

export function HeroSection() {
    const { displayWord, cursorVisible } = useTypewriter(words);

    return (
        <section className="relative flex min-h-[calc(100vh-5rem)] items-center justify-center overflow-hidden px-4 py-20">
            {/* Background */}
            <div className="pointer-events-none absolute inset-0 ">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,black,transparent)]" />
            </div>

            <div className="relative z-10 mx-auto max-w-4xl text-center py-4">
                <Reveal>
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Feito para estudantes universitários
                    </div>
                </Reveal>

                <Reveal delay={0.1}>
                    <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                        O teu trabalho académico,{" "}
                        <span className="relative inline-block min-w-[10rem] text-primary">
                            {displayWord}
                            <span
                                className={`absolute -right-1 top-0 h-full w-0.5 bg-primary transition-opacity duration-100 ${
                                    cursorVisible ? "opacity-100" : "opacity-0"
                                }`}
                            />
                        </span>
                        <br />
                        sem passar a noite em claro
                    </h1>
                </Reveal>

                <Reveal delay={0.2}>
                    <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
                        Do tema ao documento pronto para submissão. Estrutura
                        automática, normas ABNT, português de Moçambique e
                        exportação DOCX — tudo numa só plataforma.
                    </p>
                </Reveal>

                <Reveal delay={0.3}>
                    <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <Button
                            asChild
                            size="lg"
                            className="h-12 px-8 text-base font-semibold shadow-lg shadow-primary/25 transition-shadow hover:shadow-xl hover:shadow-primary/30"
                        >
                            <Link href="/register">
                                Começar Grátis
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            size="lg"
                            className="h-12 px-8 text-base"
                        >
                            <a href="#demo">Ver Demo</a>
                        </Button>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
