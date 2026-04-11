"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Reveal } from "./animations";

export function FinalCTA() {
    const t = useTranslations("landing.finalCTA");

    return (
        <section className="py-20 md:py-28">
            <div className="container mx-auto px-4">
                <div className="max-w-3xl mx-auto text-center">
                    <Reveal>
                        <div className="relative p-8 md:p-12 rounded-3xl bg-card/90 backdrop-blur-xl border border-border/50 shadow-xl">
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">
                                {t("titlePrefix")}{" "}
                                <span className="text-primary">{t("titleHighlight")}</span>
                            </h2>

                            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                                {t("subtitle")}
                            </p>

                            <div className="flex justify-center">
                                <Button
                                    size="lg"
                                    className="h-14 px-10 rounded-xl font-semibold text-base bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                                    asChild
                                >
                                    <Link href="/register">
                                        {t("cta")}
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </div>
        </section>
    );
}
