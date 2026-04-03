"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Check, Loader2, Sparkles, CreditCard, Zap, History, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface PackageOption {
  key: "FREE" | "STARTER" | "PRO";
  name: string;
  description: string;
  price: number;
  worksPerMonth: number;
  popular: boolean;
  features: string[];
}

type PaymentMethod = "MPESA" | "EMOLA";

interface SubscriptionData {
  subscription: {
    package: string;
    status: string;
    worksPerMonth: number;
    worksUsed: number;
    remaining: number;
    lastReset?: string;
  };
  extraWorks: Array<{
    id: string;
    quantity: number;
    used: number;
    expiresAt: string;
  }>;
  plans: PackageOption[];
  extraWorkPrice: number;
  paymentGateway?: "SIMULATED" | "PAYSUITE";
  paymentDefaultProvider?: "SIMULATED" | "MPESA" | "EMOLA";
  transactions: Array<{
    id: string;
    moneyAmount: number;
    creditsAmount: number;
    status: string;
    createdAt: string;
    payloadJson: Record<string, unknown> | null;
  }>;
  nextResetDate: string | null;
}

export default function SubscriptionPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [extraQuantity, setExtraQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("MPESA");

  const fetchSubscription = React.useCallback(async () => {
    try {
      const res = await fetch("/api/subscription");
      const data = await res.json();
      if (data.success) {
        setSubscriptionData(data.data);
      } else if (data.subscription) {
        setSubscriptionData(data);
      }
    } catch {
      console.error("Fetch subscription error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const getPackageLabel = React.useCallback((packageKey: string) => {
    const labels: Record<string, string> = {
      FREE: "Free",
      STARTER: "Starter",
      PRO: "Pro",
    };

    return labels[packageKey] || packageKey;
  }, []);

  const handlePurchasePackage = async (pkgKey: string) => {
    setIsPurchasing(pkgKey);
    try {
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: pkgKey, provider: paymentMethod }),
      });
      const data = await res.json();

      if (data.success) {
        const checkoutUrl = data.payment?.payloadJson?.checkoutUrl;
        const checkoutInstructions = data.payment?.payloadJson?.checkoutInstructions;

        if (data.payment?.status === "PENDING" && typeof checkoutUrl === "string") {
          toast({
            title: "Checkout iniciado",
            description: checkoutInstructions || `Continue o pagamento do pacote ${getPackageLabel(pkgKey)}.`,
          });
          window.location.href = checkoutUrl;
          return;
        }

        toast({
          title: "Sucesso",
          description:
            checkoutInstructions || `Pacote ${getPackageLabel(pkgKey)} ativado com sucesso!`,
        });
        fetchSubscription();
      } else {
        toast({
          title: "Erro",
          description: data.error || "Erro ao ativar pacote",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erro",
        description: "Erro ao processar pagamento",
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(null);
    }
  };

  const handlePurchaseExtra = async () => {
    setIsPurchasing("extra");
    try {
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: extraQuantity, provider: paymentMethod }),
      });
      const data = await res.json();

      if (data.success) {
        const checkoutUrl = data.payment?.payloadJson?.checkoutUrl;
        const checkoutInstructions = data.payment?.payloadJson?.checkoutInstructions;

        if (data.payment?.status === "PENDING" && typeof checkoutUrl === "string") {
          toast({
            title: "Checkout iniciado",
            description:
              checkoutInstructions || `Continue o pagamento de ${extraQuantity} trabalho(s) extra(s).`,
          });
          window.location.href = checkoutUrl;
          return;
        }

        toast({
          title: "Sucesso",
          description:
            checkoutInstructions || `${extraQuantity} trabalho(s) extra(s) adicionado(s)!`,
        });
        fetchSubscription();
        setExtraQuantity(1);
      } else {
        toast({
          title: "Erro",
          description: data.error || "Erro ao comprar trabalhos extra",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erro",
        description: "Erro ao processar pagamento",
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentPlan = subscriptionData?.subscription?.package || "FREE";
  const currentRemaining = subscriptionData?.subscription?.remaining || 0;
  const currentUsed = subscriptionData?.subscription?.worksUsed || 0;
  const currentLimit = subscriptionData?.subscription?.worksPerMonth || 1;
  const packages = subscriptionData?.plans || [];
  const extraWorkPrice = subscriptionData?.extraWorkPrice || 50;
  const extraWorks = subscriptionData?.extraWorks || [];
  const transactions = subscriptionData?.transactions || [];
  const nextResetDate = subscriptionData?.nextResetDate;
  const paymentGateway = subscriptionData?.paymentGateway || "SIMULATED";

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "dd MMM yyyy", { locale: pt });
  };

  const getTransactionLabel = (tx: any) => {
    const payload = tx.payloadJson || {};
    if (payload.package) return `Pacote ${getPackageLabel(payload.package)}`;
    if (payload.quantity) return `${payload.quantity} trabalho(s) extra(s)`;
    if (tx.moneyAmount) return `${tx.moneyAmount} MZN`;
    return "Transação";
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Pacotes e Subscrição</h1>
        <p className="text-muted-foreground mt-2">
          Escolha o pacote ideal para as suas necessidades
        </p>
      </div>

      {/* Current Status */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            A Sua Subscrição
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">Pacote atual</div>
              <div className="text-2xl font-bold">{getPackageLabel(currentPlan)}</div>
            </div>
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">Trabalhos usados</div>
              <div className="text-2xl font-bold">
                {currentUsed} <span className="text-muted-foreground">/ {currentLimit}</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">Trabalhos restantes</div>
              <div className="text-2xl font-bold text-primary">{currentRemaining}</div>
            </div>
          </div>
          {currentRemaining === 0 && (
            <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3">
              <p className="text-sm text-warning">
                Alcançou o limite de trabalhos deste mês. Faça upgrade do pacote ou compre trabalhos extras.
              </p>
            </div>
          )}
          {nextResetDate && (
            <div className="mt-3 text-sm text-muted-foreground">
              Próximo reset: {formatDate(nextResetDate)}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Método de pagamento</CardTitle>
          <CardDescription>
            Escolha entre M-Pesa e e-Mola. O ambiente actual está em modo {paymentGateway === "PAYSUITE" ? "produção" : "sandbox"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "MPESA", label: "M-Pesa", helper: "Vodacom" },
              { key: "EMOLA", label: "e-Mola", helper: "Movitel" },
            ].map((method) => (
              <button
                key={method.key}
                type="button"
                onClick={() => setPaymentMethod(method.key as PaymentMethod)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  paymentMethod === method.key
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="font-medium">{method.label}</div>
                <div className="text-sm text-muted-foreground">{method.helper}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Packages */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {packages.map((pkg) => {
          const isCurrentPlan = pkg.key === currentPlan;
          const isPopular = pkg.popular;

          return (
            <Card
              key={pkg.key}
              className={`relative ${isPopular ? "border-primary shadow-lg" : ""}`}
            >
              {isPopular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Mais Popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle>{pkg.name}</CardTitle>
                <CardDescription>{pkg.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <span className="text-4xl font-bold">{pkg.price}</span>
                  <span className="text-muted-foreground"> MZN</span>
                  {pkg.price > 0 && (
                    <span className="text-sm text-muted-foreground">/mês</span>
                  )}
                </div>
                <div className="text-lg font-semibold mb-4">
                  {pkg.worksPerMonth} trabalho{pkg.worksPerMonth !== 1 ? "s" : ""}/mês
                </div>
                <ul className="space-y-2">
                  {pkg.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {isCurrentPlan ? (
                  <Button disabled className="w-full" variant="secondary">
                    Pacote Atual
                  </Button>
                ) : pkg.key === "FREE" ? (
                  <Button disabled className="w-full" variant="outline">
                    Grátis
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handlePurchasePackage(pkg.key)}
                    disabled={isPurchasing === pkg.key}
                  >
                    {isPurchasing === pkg.key ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Ativar {pkg.name}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Extra Works Purchase */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Comprar Trabalhos Extras
          </CardTitle>
          <CardDescription>
            Precisa de mais trabalhos? Compre extras a {extraWorkPrice} MZN cada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                Quantidade
              </label>
              <select
                value={extraQuantity}
                onChange={(e) => setExtraQuantity(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n} trabalho{n !== 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <div className="text-sm text-muted-foreground mb-2">Total</div>
              <div className="text-2xl font-bold">
                {extraQuantity * extraWorkPrice} MZN
              </div>
            </div>
            <Button
              onClick={handlePurchaseExtra}
              disabled={isPurchasing === "extra" || extraQuantity < 1}
            >
              {isPurchasing === "extra" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Comprar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Extra Works List */}
      {extraWorks.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Trabalhos Extras Comprados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {extraWorks.map((work) => (
                <div
                  key={work.id}
                  className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="font-medium">
                      {work.quantity} trabalho{work.quantity !== 1 ? "s" : ""}
                    </div>
                    <div className="text-sm text-muted-foreground break-words">
                      Usados: {work.used} / {work.quantity} | Expira:{" "}
                      {new Date(work.expiresAt).toLocaleDateString("pt-MZ")}
                    </div>
                  </div>
                  <Badge variant="outline" className="w-fit">
                    {work.quantity - work.used} restantes
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      {transactions.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Transações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      tx.status === "CONFIRMED" ? "bg-success/10" : "bg-warning/10"
                    }`}>
                      {tx.status === "CONFIRMED" ? (
                        <ArrowUpRight className="h-4 w-4 text-success" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-warning" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium break-words">{getTransactionLabel(tx)}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(tx.createdAt), "dd MMM yyyy, HH:mm", { locale: pt })}
                      </div>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="font-medium">
                      {tx.moneyAmount > 0 ? `+${tx.moneyAmount}` : tx.moneyAmount} MZN
                    </div>
                    <Badge variant={tx.status === "CONFIRMED" ? "default" : "secondary"}>
                      {tx.status === "CONFIRMED" ? "Confirmado" : "Pendente"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
