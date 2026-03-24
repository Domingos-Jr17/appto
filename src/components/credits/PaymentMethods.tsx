"use client";

import * as React from "react";
import { Smartphone, Shield, Check, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PaymentPackage {
  id: string;
  credits: number;
  price: number;
  popular?: boolean;
  bonus?: number;
}

const paymentPackages: PaymentPackage[] = [
  { id: "starter", credits: 500, price: 250 },
  { id: "basic", credits: 1200, price: 500, bonus: 100 },
  { id: "standard", credits: 2500, price: 1000, popular: true, bonus: 300 },
  { id: "premium", credits: 5500, price: 2000, bonus: 1000 },
];

interface PaymentMethodsProps {
  className?: string;
}

export function PaymentMethods({ className }: PaymentMethodsProps) {
  const [selectedMethod, setSelectedMethod] = React.useState<"mpesa" | "emola">("mpesa");
  const [selectedPackage, setSelectedPackage] = React.useState<string>("standard");

  return (
    <div className={cn("space-y-6", className)}>
      {/* Payment Method Selection */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Método de Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {/* M-Pesa */}
            <button
              onClick={() => setSelectedMethod("mpesa")}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                selectedMethod === "mpesa"
                  ? "border-primary bg-primary/5"
                  : "border-border/50 hover:border-border bg-muted/30"
              )}
            >
              {selectedMethod === "mpesa" && (
                <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
                <span className="text-xl font-bold text-destructive">M</span>
              </div>
              <span className="font-medium">M-Pesa</span>
              <span className="text-xs text-muted-foreground">Vodacom</span>
            </button>

            {/* e-Mola */}
            <button
              onClick={() => setSelectedMethod("emola")}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                selectedMethod === "emola"
                  ? "border-primary bg-primary/5"
                  : "border-border/50 hover:border-border bg-muted/30"
              )}
            >
              {selectedMethod === "emola" && (
                <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-info/10">
                <span className="text-xl font-bold text-info">e</span>
              </div>
              <span className="font-medium">e-Mola</span>
              <span className="text-xs text-muted-foreground">Movitel</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Package Selection */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Escolha um Pacote</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {paymentPackages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg.id)}
                className={cn(
                  "relative flex items-center justify-between rounded-xl border-2 p-4 transition-all text-left",
                  selectedPackage === pkg.id
                    ? "border-primary bg-primary/5"
                    : "border-border/50 hover:border-border bg-muted/30"
                )}
              >
                {pkg.popular && (
                  <Badge className="absolute -top-2 right-4 gradient-primary text-primary-foreground text-xs">
                    Popular
                  </Badge>
                )}
                {selectedPackage === pkg.id && (
                  <div className="absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-semibold">
                    {pkg.credits.toLocaleString("pt-MZ")} créditos
                  </p>
                  {pkg.bonus && (
                    <p className="text-sm text-success">
                      +{pkg.bonus.toLocaleString("pt-MZ")} bónus
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    ~{Math.floor((pkg.credits + (pkg.bonus || 0)) / 50)} trabalhos
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{pkg.price.toLocaleString("pt-MZ")} MT</p>
                  <p className="text-xs text-muted-foreground">
                    {(pkg.price / pkg.credits).toFixed(2)} MT/crédito
                  </p>
                </div>
              </button>
            ))}
          </div>

          <Button className="w-full mt-4 gap-2 gradient-primary text-primary-foreground hover:opacity-90">
            <Smartphone className="h-4 w-4" />
            Pagar com {selectedMethod === "mpesa" ? "M-Pesa" : "e-Mola"}
          </Button>
        </CardContent>
      </Card>

      {/* Trust Badges */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Shield className="h-4 w-4 text-primary" />
          <span>Pagamento Seguro</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-primary" />
          <span>Créditos instantâneos</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Check className="h-4 w-4 text-primary" />
          <span>Sem taxa adicional</span>
        </div>
      </div>
    </div>
  );
}
