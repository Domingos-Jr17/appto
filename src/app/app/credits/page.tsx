"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Coins,
  History,
  HelpCircle,
  Sparkles,
  CreditCard,
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

interface CreditData {
  balance: number;
  used: number;
  transactions: Transaction[];
}

const plans = [
  {
    name: "Starter",
    price: 250,
    credits: 500,
    packageKey: "starter",
    features: [
      "~10 trabalhos académicos",
      "Suporte por email",
      "Acesso a todos os tipos",
    ],
  },
  {
    name: "Standard",
    price: 1000,
    credits: 2500,
    packageKey: "basic",
    popular: true,
    features: [
      "~50 trabalhos académicos",
      "Suporte prioritário",
      "Acesso a todos os tipos",
      "Bónus de 300 créditos",
    ],
  },
  {
    name: "Premium",
    price: 2000,
    credits: 5500,
    packageKey: "academic",
    features: [
      "~110 trabalhos académicos",
      "Suporte VIP 24/7",
      "Acesso a todos os tipos",
      "Bónus de 1000 créditos",
      "Funcionalidades beta",
    ],
  },
];

const faqItems = [
  {
    question: "O que são créditos e como funcionam?",
    answer:
      "Créditos são a moeda do aptto. Cada operação (gerar texto, criar referências, etc.) consome créditos. Em média, um trabalho académico completo consome cerca de 50 créditos. Os créditos nunca expiram e podem ser usados a qualquer momento.",
  },
  {
    question: "Quanto custa cada operação?",
    answer:
      "O custo varia por operação: geração de texto (10 créditos), melhoria de texto (5 créditos), sugestões (7 créditos), referências ABNT (3 créditos), geração de trabalho completo (110 créditos). O sistema sempre mostra o custo antes de confirmar.",
  },
  {
    question: "Posso obter reembolso dos créditos?",
    answer:
      "Não oferecemos reembolso de créditos já adquiridos. No entanto, se houver problemas técnicos com a nossa plataforma que resultem em perda de créditos, entraremos em contacto para os repor automaticamente.",
  },
  {
    question: "Os créditos expiram?",
    answer:
      "Não! Os seus créditos não expiram. Ficam disponíveis na sua conta até serem utilizados, independentemente do tempo que passe.",
  },
  {
    question: "Como funciona o pagamento por M-Pesa/e-Mola?",
    answer:
      "Após seleccionar o pacote, será redireccionado para uma página segura de pagamento. Insira o seu número de telemóvel e confirme a transacção com o seu PIN. Os créditos são creditados instantaneamente após confirmação.",
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
  });

  useEffect(() => {
    fetchCredits();
  }, []);

  const fetchCredits = async () => {
    try {
      const response = await fetch("/api/credits?transactions=true");
      const data = await response.json();
      setCreditData(data);
    } catch (error) {
      console.error("Error fetching credits:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os créditos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async (plan: typeof plans[0]) => {
    setIsPurchasing(plan.packageKey);

    try {
      const response = await fetch("/api/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: plan.packageKey,
          paymentMethod: "simulado",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      toast({
        title: "Pagamento processado!",
        description: `Foram adicionados ${data.creditsAdded} créditos à sua conta`,
      });

      // Refresh credit data
      fetchCredits();
    } catch (error: any) {
      toast({
        title: "Erro no pagamento",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(null);
    }
  };

  // Generate usage data from transactions
  const usageData = React.useMemo(() => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
    return months.map((month, i) => ({
      month,
      credits: Math.floor(Math.random() * 400) + 200,
    }));
  }, []);

  // Map transaction type to display
  const getTypeInfo = (type: string) => {
    switch (type) {
      case "PURCHASE":
        return { icon: ArrowUpRight, color: "emerald", label: "Compra" };
      case "BONUS":
        return { icon: Sparkles, color: "amber", label: "Bónus" };
      case "REFUND":
        return { icon: ArrowUpRight, color: "blue", label: "Reembolso" };
      case "SUBSCRIPTION":
        return { icon: CreditCard, color: "purple", label: "Subscrição" };
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Coins className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Créditos</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os seus créditos e pagamentos
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Balance & Usage */}
        <div className="space-y-6 lg:col-span-1">
          <BalanceCard 
            balance={creditData.balance} 
            usageThisMonth={creditData.used} 
          />
          <UsageChart data={usageData} />
        </div>

        {/* Right Column - Payment Plans */}
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
                    key={plan.name}
                    className={`relative rounded-xl border-2 p-5 ${
                      plan.popular
                        ? "border-primary bg-primary/5"
                        : "border-border/50 bg-muted/30"
                    }`}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 gradient-primary text-primary-foreground">
                        Mais Popular
                      </Badge>
                    )}
                    <div className="text-center mb-4">
                      <h3 className="font-semibold text-lg">{plan.name}</h3>
                      <div className="mt-2">
                        <span className="text-3xl font-bold">{plan.price.toLocaleString("pt-MZ")}</span>
                        <span className="text-muted-foreground"> MT</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {plan.credits.toLocaleString("pt-MZ")} créditos
                      </p>
                    </div>
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          </div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full mt-4 ${
                        plan.popular
                          ? "gradient-primary text-primary-foreground hover:opacity-90"
                          : ""
                      }`}
                      variant={plan.popular ? "default" : "outline"}
                      onClick={() => handlePurchase(plan)}
                      disabled={isPurchasing !== null}
                    >
                      {isPurchasing === plan.packageKey ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
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

      {/* Transaction History */}
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
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Descrição</TableHead>
                    <TableHead className="text-muted-foreground">Data</TableHead>
                    <TableHead className="text-muted-foreground text-right">Créditos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditData.transactions.map((tx) => {
                    const typeInfo = getTypeInfo(tx.type);
                    const Icon = typeInfo.icon;
                    const isCredit = tx.amount > 0;

                    return (
                      <TableRow key={tx.id} className="group">
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
                              isCredit ? "text-emerald-500 font-medium" : "text-foreground"
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
              <History className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">Sem transacções ainda</h3>
              <p className="text-sm text-muted-foreground">
                As suas transacções aparecerão aqui
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FAQ Section */}
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
                key={index}
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
