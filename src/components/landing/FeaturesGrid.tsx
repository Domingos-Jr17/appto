"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Reveal } from "./animations";
import { getGenericComparison } from "./data";
import { cn } from "@/lib/utils";

export function FeaturesGrid() {
  const t = useTranslations("landing.featuresGrid");
  const comparisonT = useTranslations("landing.featuresGrid.comparison.rows");
  const coreFeatures = [
    {
      title: t("cards.delivery.title"),
      description: t("cards.delivery.description"),
    },
    {
      title: t("cards.formatting.title"),
      description: t("cards.formatting.description"),
    },
    {
      title: t("cards.language.title"),
      description: t("cards.language.description"),
    },
    {
      title: t("cards.export.title"),
      description: t("cards.export.description"),
    },
  ];
  const genericComparison = getGenericComparison(comparisonT);

  return (
    <section id="recursos" className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <Reveal>
          <div className="text-center mb-12 md:mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              {t("badge")}
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              {t("titlePrefix")}{" "}
              <span className="text-primary">{t("titleHighlight")}</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("subtitle")}
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
          {coreFeatures.map((feature, index) => (
            <div
              key={index}
              className={cn(
                "p-6 rounded-2xl border bg-card/80 backdrop-blur-xl",
                "hover:border-primary/30 transition-colors"
              )}
            >
              <h3 className="text-lg font-semibold mb-2 text-foreground">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <Reveal>
          <div className="max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold mb-6 text-center">
              {t("comparison.title")}
            </h3>
            <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl overflow-hidden">
              <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-border bg-muted/30">
                <div className="text-sm font-medium text-muted-foreground">
                  {t("comparison.featureColumn")}
                </div>
                <div className="text-center">
                  <span className="inline-block px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                    {t("comparison.apttoColumn")}
                  </span>
                </div>
                <div className="text-center">
                  <span className="inline-block px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm font-medium">
                    {t("comparison.genericColumn")}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-border/50">
                {genericComparison.map((row, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-3 gap-4 px-6 py-3 items-center"
                  >
                    <div className="text-sm text-foreground/80">
                      {row.feature}
                    </div>
                    <div className="flex justify-center">
                      {row.aptto ? (
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <Check className="w-4 h-4 text-primary" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                          <X className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex justify-center">
                      {row.generic ? (
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <Check className="w-4 h-4 text-primary" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                          <X className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
