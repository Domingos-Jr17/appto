"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Coins,
  History,
  HelpCircle,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { BalanceCard } from "@/components/credits/BalanceCard";
import { UsageChart } from "@/components/credits/UsageChart";

interface Transaction {
  id: string;
  type: string;
  description: string;
  amount: number;
  createdAt: string;
}

interface CreditPackage {
  credits: number;
  price: number;
  currency: string;
}

interface CreditData {
  balance: number;
  used: number;
  transactions: Transaction[];
  packages: Record<string, CreditPackage>;
}

const faqItems = [
  {
    question: "O que são créditos e como funcionam?",
    answer:
      "Créditos são a unidade de consumo da plataforma. Cada geração, melhoria ou exportação desconta o custo correspondente e fica registada no histórico da conta.",
  },
  {
    question: "Quanto custa cada operação?",
    answer:
      "Os custos são centralizados no servidor. Hoje, gerar conteúdo custa 10 créditos, melhorar texto custa 5, referências custam 3 e exportação DOCX/PDF usa uma tarifa dedicada.",
  },
  {
    question: "Posso obter reembolso dos créditos?",
    answer:
      "Reembolsos não são automáticos. O histórico de transacções serve como trilho de auditoria para corrigir falhas operacionais quando necessário.",
  },
  {
    question: "Os créditos expiram?",
    answer:
      "Não. O saldo permanece disponível até ser consumido por operações reais da plataforma.",
  },
  {
    question: "Como funciona o pagamento por M-Pesa/e-Mola?",
    answer:
      "Nesta fase, a app usa checkout sandbox para validar o fluxo de compra e crédito. Os adaptadores reais de M-Pesa/e-Mola permanecem em homologação e só serão activados quando estiverem operacionais.",
  },
];

export default function CreditsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [creditData, setCreditData] = useState<CreditData>({
    balance: 0,
    used: 0,
    transactions: [],
    packages: {},
  });

  const fetchCredits = React.useCallback(async () => {
    try {
      const response = await fetch("/api/credits?transactions=true");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível carregar os créditos.");
      }

      setCreditData(data);
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os créditos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchCredits();
  }, [fetchCredits]);

  const plans = React.useMemo(() => {
    return Object.entries(creditData.packages).map(([packageKey, value]) => ({
      name:
        packageKey === "starter"
          ? "Starter"
          : packageKey === "basic"
            ? "Standard"
            : packageKey === "academic"
              ? "Academic"
              : "Pro",
      price: value.price,
      credits: value.credits,
      packageKey,
      popular: packageKey === "basic",
      currency: value.currency,
      features: [
        `${value.credits.toLocaleString("pt-MZ")} créditos no saldo`,
        "Checkout sandbox com confirmação automática em ambiente de teste",
        "Histórico de compra persistido na conta",
      ],
    }));
  }, [creditData.packages]);

  const handlePurchase = async (packageKey: string) => {
    setIsPurchasing(packageKey);

    try {
      const response = await fetch("/api/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageKey,
          provider: "SIMULATED",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Falha ao processar pagamento.");
      }

      toast({
        title: "Checkout concluído",
        description: `Pagamento sandbox confirmado. Saldo atualizado para ${data.balance} créditos.`,
      });

      await fetchCredits();
    } catch (error) {
      toast({
        title: "Erro no pagamento",
        description:
          error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(null);
    }
  };

  const usageData = React.useMemo(() => {
    const grouped = new Map<string, number>();

    for (const transaction of creditData.transactions) {
      if (transaction.amount >= 0) continue;
      const date = new Date(transaction.createdAt);
      const monthLabel = date.toLocaleDateString("pt-MZ", { month: "short" });
      grouped.set(monthLabel, (grouped.get(monthLabel) || 0) + Math.abs(transaction.amount));
    }

    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const monthLabel = date.toLocaleDateString("pt-MZ", { month: "short" });
      return {
        month: monthLabel,
        credits: grouped.get(monthLabel) || 0,
      };
    });
  }, [creditData.transactions]);

  const getTypeInfo = (type: string) => {
    switch (type) {
      case "PURCHASE":
        return { icon: ArrowUpRight, color: "emerald", label: "Compra" };
      case "BONUS":
        return { icon: Sparkles, color: "amber", label: "Bónus" };
      case "REFUND":
        return { icon: ArrowUpRight, color: "blue", label: "Reembolso" };
      default:
        return { icon: ArrowDownRight, color: "sky", label: "Uso" };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-MZ", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-[28px] border border-border/60 bg-background/75 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Coins className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Créditos</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie o saldo, o histórico e o checkout sandbox.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <BalanceCard balance={creditData.balance} usageThisMonth={creditData.used} />
          <UsageChart data={usageData} />
        </div>

        <div className="lg:col-span-2">
          <Card className="border-border/50 bg-card/80 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Sparkles className="h-5 w-5 text-primary" />
                Recarregar Créditos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {plans.map((plan) => (
                  <div
                    key={plan.packageKey}
                    className={`relative rounded-xl border-2 p-5 ${
                      plan.popular
                        ? "border-primary bg-primary/5"
                        : "border-border/50 bg-muted/30"
                    }`}
                  >
                    {plan.popular ? (
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 gradient-primary text-primary-foreground">
                        Mais Popular
                      </Badge>
                    ) : null}
                    <div className="mb-4 text-center">
                      <h3 className="text-lg font-semibold">{plan.name}</h3>
                      <div className="mt-2">
                        <span className="text-3xl font-bold">
                          {plan.price.toLocaleString("pt-MZ")}
                        </span>
                        <span className="text-muted-foreground"> {plan.currency}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {plan.credits.toLocaleString("pt-MZ")} créditos
                      </p>
                    </div>
                    <ul className="space-y-2">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm">
                          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          </div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`mt-4 w-full ${
                        plan.popular
                          ? "gradient-primary text-primary-foreground hover:opacity-90"
                          : ""
                      }`}
                      variant={plan.popular ? "default" : "outline"}
                      onClick={() => handlePurchase(plan.packageKey)}
                      disabled={isPurchasing !== null}
                    >
                      {isPurchasing === plan.packageKey ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {isPurchasing === plan.packageKey ? "Processando..." : "Seleccionar"}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <History className="h-5 w-5 text-primary" />
              Histórico de Transacções
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {creditData.transactions.length} transacções
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {creditData.transactions.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Descrição</TableHead>
                    <TableHead className="text-muted-foreground">Data</TableHead>
                    <TableHead className="text-right text-muted-foreground">
                      Créditos
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditData.transactions.map((tx) => {
                    const typeInfo = getTypeInfo(tx.type);
                    const Icon = typeInfo.icon;
                    const isCredit = tx.amount > 0;

                    return (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                typeInfo.color === "emerald"
                                  ? "bg-emerald-500/10"
                                  : typeInfo.color === "amber"
                                    ? "bg-amber-500/10"
                                    : typeInfo.color === "sky"
                                      ? "bg-sky-500/10"
                                      : "bg-primary/10"
                              }`}
                            >
                              <Icon
                                className={`h-4 w-4 ${
                                  typeInfo.color === "emerald"
                                    ? "text-emerald-500"
                                    : typeInfo.color === "amber"
                                      ? "text-amber-500"
                                      : typeInfo.color === "sky"
                                        ? "text-sky-500"
                                        : "text-primary"
                                }`}
                              />
                            </div>
                            <div>
                              <span className="font-medium">{tx.description}</span>
                              <p className="text-xs text-muted-foreground">{typeInfo.label}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(tx.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              isCredit ? "font-medium text-emerald-500" : "text-foreground"
                            }
                          >
                            {isCredit ? "+" : ""}
                            {tx.amount}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <h3 className="mb-2 text-lg font-medium">Sem transacções ainda</h3>
              <p className="text-sm text-muted-foreground">
                As suas compras e consumos de crédito aparecerão aqui.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80 backdrop-blur-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <HelpCircle className="h-5 w-5 text-primary" />
            Perguntas Frequentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => (
              <AccordionItem
                key={item.question}
                value={`item-${index}`}
                className="border-border/50"
              >
                <AccordionTrigger className="text-left hover:no-underline hover:text-primary">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
