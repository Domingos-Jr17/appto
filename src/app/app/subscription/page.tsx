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

interface Plan {
  key: "FREE" | "STARTER" | "PRO";
  name: string;
  description: string;
  price: number;
  worksPerMonth: number;
  popular: boolean;
  features: string[];
}

interface SubscriptionData {
  subscription: {
    plan: string;
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
  plans: Plan[];
  extraWorkPrice: number;
  transactions: Array<{
    id: string;
    moneyAmount: number;
    creditsAmount: number;
    type: string;
    status: string;
    createdAt: string;
    payloadJson: any;
  }>;
  nextResetDate: string | null;
}

export default function SubscriptionPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [extraQuantity, setExtraQuantity] = useState(1);

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

  const handlePurchasePlan = async (planKey: string) => {
    setIsPurchasing(planKey);
    try {
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();

      if (data.success) {
        toast({
          title: "Sucesso",
          description: `Plano ${planKey} ativado com sucesso!`,
        });
        fetchSubscription();
      } else {
        toast({
          title: "Erro",
          description: data.error || "Erro ao ativar plano",
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
        body: JSON.stringify({ quantity: extraQuantity }),
      });
      const data = await res.json();

      if (data.success) {
        toast({
          title: "Sucesso",
          description: `${extraQuantity} trabalho(s) extra(s) adicionado(s)!`,
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

  const currentPlan = subscriptionData?.subscription?.plan || "FREE";
  const currentRemaining = subscriptionData?.subscription?.remaining || 0;
  const currentUsed = subscriptionData?.subscription?.worksUsed || 0;
  const currentLimit = subscriptionData?.subscription?.worksPerMonth || 1;
  const plans = subscriptionData?.plans || [];
  const extraWorkPrice = subscriptionData?.extraWorkPrice || 50;
  const extraWorks = subscriptionData?.extraWorks || [];
  const transactions = subscriptionData?.transactions || [];
  const nextResetDate = subscriptionData?.nextResetDate;

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "dd MMM yyyy", { locale: pt });
  };

  const getTransactionLabel = (tx: any) => {
    const payload = tx.payloadJson || {};
    if (payload.plan) return `Plano ${payload.plan}`;
    if (payload.quantity) return `${payload.quantity} trabalho(s) extra(s)`;
    if (tx.creditsAmount) return `${Math.abs(tx.creditsAmount)} créditos`;
    return "Transação";
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Planos e Subscrição</h1>
        <p className="text-muted-foreground mt-2">
          Escolha o plano ideal para as suas necessidades
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
              <div className="text-sm text-muted-foreground">Plano atual</div>
              <div className="text-2xl font-bold">{currentPlan}</div>
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
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Alcançou o limite de trabalhos deste mês. faça upgrade do plano ou compre trabalhos extras.
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

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {plans.map((plan) => {
          const isCurrentPlan = plan.key === currentPlan;
          const isPopular = plan.popular;

          return (
            <Card
              key={plan.key}
              className={`relative ${isPopular ? "border-primary shadow-lg" : ""}`}
            >
              {isPopular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Mais Popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground"> MZN</span>
                  {plan.price > 0 && (
                    <span className="text-sm text-muted-foreground">/mês</span>
                  )}
                </div>
                <div className="text-lg font-semibold mb-4">
                  {plan.worksPerMonth} trabalho{plan.worksPerMonth !== 1 ? "s" : ""}/mês
                </div>
                <ul className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {isCurrentPlan ? (
                  <Button disabled className="w-full" variant="secondary">
                    Plano Atual
                  </Button>
                ) : plan.key === "FREE" ? (
                  <Button disabled className="w-full" variant="outline">
                    Grátis
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handlePurchasePlan(plan.key)}
                    disabled={isPurchasing === plan.key}
                  >
                    {isPurchasing === plan.key ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Ativar {plan.name}
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
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">
                      {work.quantity} trabalho{work.quantity !== 1 ? "s" : ""}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Usados: {work.used} / {work.quantity} | Expira:{" "}
                      {new Date(work.expiresAt).toLocaleDateString("pt-MZ")}
                    </div>
                  </div>
                  <Badge variant="outline">
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
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      tx.status === "CONFIRMED" ? "bg-green-100" : "bg-yellow-100"
                    }`}>
                      {tx.status === "CONFIRMED" ? (
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{getTransactionLabel(tx)}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(tx.createdAt), "dd MMM yyyy, HH:mm", { locale: pt })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
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
