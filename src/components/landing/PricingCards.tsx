"use client";

import { Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BILLING_PLAN_DISPLAY, EXTRA_WORKS } from "@/lib/billing";
import { Reveal } from "./animations";

const packages = BILLING_PLAN_DISPLAY.map((plan) => ({
  name: `Pacote ${plan.name}`,
  price: String(plan.price),
  currency: "MZN",
  period: plan.price > 0 ? "/mês" : "para sempre",
  description: plan.description,
  features: plan.features.map((text) => ({ text, included: true })),
  cta: plan.key === "FREE" ? "Começar Grátis" : `Escolher ${plan.name}`,
  highlighted: plan.popular,
}));

export function PricingCards() {
  return (
    <section id="precos" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pacotes que <span className="text-primary">cabem no teu bolso</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Começa gratuitamente, faz upgrade quando precisares e compra trabalhos extras por {EXTRA_WORKS.price} MZN cada
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {packages.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                "relative h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-xl bg-card/80 backdrop-blur-xl",
                plan.highlighted
                  ? "border-primary/50 shadow-2xl shadow-primary/20"
                  : "border-border/50 hover:border-primary/40"
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <span className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg">
                    Mais Popular
                  </span>
                </div>
              )}

              <CardHeader className="text-center pb-2 pt-6">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-primary">
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {plan.currency}{plan.period}
                    </span>
                  </div>
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature.text}
                      className={cn(
                        "flex items-center gap-3 text-sm",
                        feature.included
                          ? "text-foreground"
                          : "text-muted-foreground/50"
                      )}
                    >
                      <div
                        className={cn(
                          "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center",
                          feature.included
                            ? "bg-primary/10"
                            : "bg-muted/50"
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
                      </div>
                      <span className={cn(!feature.included && "line-through")}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  asChild
                  className={cn(
                    "w-full",
                    plan.highlighted
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  )}
                  size="lg"
                >
                  <Link href="/register" className="inline-flex items-center justify-center gap-2">
                    <span>{plan.cta}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PricingCards;
