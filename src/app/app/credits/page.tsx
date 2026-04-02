"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
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
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useAppShellData } from "@/components/app-shell/AppShellDataContext";
import { BalanceCard } from "@/components/credits/BalanceCard";
import { UsageChart } from "@/components/credits/UsageChart";
import { fetchCreditDetails, type CreditDetailsRecord } from "@/lib/app-data";
import { getVisibleCreditTransactions } from "@/lib/workspace-ui";
import { CREDIT_PACKAGES_DISPLAY } from "@/lib/credits";

const faqItems = [
    {
        question: "O que são créditos e como funcionam?",
        answer: "Créditos são a unidade de consumo da plataforma. Cada geração, melhoria ou exportação desconta o custo correspondente e fica registada no histórico da conta.",
    },
    {
        question: "Quanto custa cada operação?",
        answer: "Cada operação tem um custo fixo definido no servidor. Gerar conteúdo custa 10 créditos, melhorar texto custa 5, referências custam 3 e exportação DOCX custa 5. Consulte a lista completa de custos na página de créditos.",
    },
    {
        question: "Posso obter reembolso dos créditos?",
        answer: "Reembolsos não são automáticos. O histórico de transacções serve como trilho de auditoria para corrigir falhas operacionais quando necessário.",
    },
    {
        question: "Os créditos expiram?",
        answer: "Não. O saldo permanece disponível até ser consumido por operações reais da plataforma.",
    },
    {
        question: "Como funciona o pagamento por M-Pesa/e-Mola?",
        answer: "Nesta fase, a app usa checkout sandbox para validar o fluxo de compra e crédito. Os adaptadores reais de M-Pesa/e-Mola permanecem em homologação e só serão activados quando estiverem operacionais.",
    },
];

export default function CreditsPage() {
    const { toast } = useToast();
    const { setCredits } = useAppShellData();
    const [isLoading, setIsLoading] = useState(true);
    const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
    const [showFullHistory, setShowFullHistory] = useState(false);
    const [creditData, setCreditData] = useState<CreditDetailsRecord>({
        balance: 0,
        used: 0,
        transactions: [],
        packages: {},
    });
    const [subscriptionData, setSubscriptionData] = useState<{
        worksUsed: number;
        worksLimit: number;
        plan: string;
    } | null>(null);

    const fetchCredits = React.useCallback(async () => {
        try {
            const [creditRes, subRes] = await Promise.all([
                fetchCreditDetails(),
                fetch("/api/subscription").then(r => r.json())
            ]);
            
            setCreditData(creditRes);
            setCredits(creditData.balance);

            if (subRes.success && subRes.data.subscription) {
                const sub = subRes.data.subscription;
                setSubscriptionData({
                    worksUsed: sub.worksUsed,
                    worksLimit: sub.worksPerMonth,
                    plan: sub.plan,
                });
            }
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
    }, [setCredits, toast]);

    useEffect(() => {
        void fetchCredits();
    }, [fetchCredits]);

    const plans = React.useMemo(() => {
        return CREDIT_PACKAGES_DISPLAY;
    }, []);

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
                description: `Pagamento sandbox confirmado. Saldo actualizado para ${data.balance} créditos.`,
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
            const monthLabel = date.toLocaleDateString("pt-MZ", {
                month: "short",
            });
            grouped.set(
                monthLabel,
                (grouped.get(monthLabel) || 0) + Math.abs(transaction.amount),
            );
        }

        const now = new Date();
        return Array.from({ length: 6 }, (_, index) => {
            const date = new Date(
                now.getFullYear(),
                now.getMonth() - (5 - index),
                1,
            );
            const monthLabel = date.toLocaleDateString("pt-MZ", {
                month: "short",
            });
            return {
                month: monthLabel,
                credits: grouped.get(monthLabel) || 0,
            };
        });
    }, [creditData.transactions]);

    const handleScrollToPackages = React.useCallback(() => {
        document
            .getElementById("credit-packages")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, []);

    const visibleTransactions = React.useMemo(
        () =>
            getVisibleCreditTransactions(
                creditData.transactions,
                showFullHistory,
                6,
            ),
        [creditData.transactions, showFullHistory],
    );
    const hasHiddenTransactions =
        creditData.transactions.length > visibleTransactions.length;

    const getTypeInfo = (type: string) => {
        switch (type) {
            case "PURCHASE":
                return {
                    icon: ArrowUpRight,
                    label: "Compra",
                    iconClass: "text-success",
                    surfaceClass: "bg-success/10 border border-success/15",
                };
            case "BONUS":
                return {
                    icon: Sparkles,
                    label: "Bónus",
                    iconClass: "text-warning",
                    surfaceClass: "bg-warning/10 border border-warning/15",
                };
            case "REFUND":
                return {
                    icon: ArrowUpRight,
                    label: "Reembolso",
                    iconClass: "text-info",
                    surfaceClass: "bg-info/10 border border-info/15",
                };
            default:
                return {
                    icon: ArrowDownRight,
                    label: "Uso",
                    iconClass: "text-info",
                    surfaceClass: "bg-info/10 border border-info/15",
                };
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
        <div className="space-y-8">
            <div className="flex flex-col gap-4 rounded-[28px] glass glass-border p-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Créditos
                    </p>
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                            Gestão de Créditos
                        </h2>
                    </div>
                </div>
            </div>

            <div className="grid gap-6">
                <div className="grid gap-6 sm:grid-cols-2">
                    {subscriptionData ? (
                        <BalanceCard
                            worksUsed={subscriptionData.worksUsed}
                            worksLimit={subscriptionData.worksLimit}
                            onRechargeClick={handleScrollToPackages}
                        />
                    ) : (
                        <BalanceCard
                            worksUsed={0}
                            worksLimit={1}
                            onRechargeClick={handleScrollToPackages}
                        />
                    )}
                    <UsageChart data={usageData} />
                </div>

                <div>
                    <Card
                        id="credit-packages"
                        className="glass glass-border rounded-[28px] bg-background/80 h-full"
                    >
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                                <Sparkles className="h-5 w-5 text-primary" />
                                Recarregar Créditos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-3">
                                {plans.map((plan) => (
                                    <div
                                        key={plan.key}
                                        className={`relative rounded-2xl border p-5 transition-all duration-200 ${
                                            plan.popular
                                                ? "border-primary/35 bg-primary/8 glass glass-border hover:border-primary/50 hover:shadow-md"
                                                : "border-border/60 bg-muted/30 hover:border-primary/30 hover:bg-muted/40 hover:shadow-sm"
                                        }`}
                                    >
                                        {plan.popular ? (
                                            <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full gradient-primary text-primary-foreground">
                                                Mais Popular
                                            </Badge>
                                        ) : null}
                                        <div className="mb-4 text-center">
                                            <h3 className="text-lg font-semibold">
                                                {plan.name}
                                            </h3>
                                            <div className="mt-2">
                                                <span className="text-3xl font-bold">
                                                    {plan.price.toLocaleString(
                                                        "pt-MZ",
                                                    )}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    {" "}
                                                    {plan.currency}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {plan.credits.toLocaleString(
                                                    "pt-MZ",
                                                )}{" "}
                                                créditos
                                            </p>
                                        </div>
                                        <ul className="space-y-2">
                                            {plan.features.map((feature) => (
                                                <li
                                                    key={feature}
                                                    className="flex items-center gap-2 text-sm"
                                                >
                                                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                                    </div>
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <Button
                                            className={`mt-4 h-12 w-full rounded-2xl text-base ${
                                                plan.popular
                                                    ? "gradient-primary text-primary-foreground hover:opacity-90"
                                                    : ""
                                            }`}
                                            variant={
                                                plan.popular
                                                    ? "default"
                                                    : "outline"
                                            }
                                            onClick={() =>
                                                handlePurchase(plan.key)
                                            }
                                            disabled={isPurchasing !== null}
                                        >
                                            {isPurchasing === plan.key ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : null}
                                            {isPurchasing === plan.key
                                                ? "A processar..."
                                                : "Seleccionar"}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="flex flex-col gap-4 rounded-[28px] glass glass-border p-5">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h3 className="flex items-center gap-2 text-xl font-semibold">
                            <History className="h-5 w-5 text-primary" />
                            Histórico de Transacções
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {creditData.transactions.length} transacções
                        </p>
                    </div>
                    {creditData.transactions.length > 6 ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="rounded-full"
                            onClick={() =>
                                setShowFullHistory((value) => !value)
                            }
                            aria-expanded={showFullHistory}
                            aria-controls="credit-history-list"
                        >
                            {showFullHistory ? "Mostrar menos" : "Ver tudo"}
                        </Button>
                    ) : null}
                </div>
            </div>

            <Card className="glass glass-border rounded-[28px] bg-background/80">
                <CardContent className="p-6">
                    {creditData.transactions.length > 0 ? (
                        <div className="space-y-3">
                            {visibleTransactions.map((tx) => {
                                const typeInfo = getTypeInfo(tx.type);
                                const Icon = typeInfo.icon;
                                const isCredit = tx.amount > 0;

                                return (
                                    <div
                                        key={tx.id}
                                        className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-background/55 px-4 py-4 transition-colors hover:bg-background/80"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`flex h-10 w-10 items-center justify-center rounded-2xl ${typeInfo.surfaceClass}`}
                                            >
                                                <Icon
                                                    className={`h-5 w-5 ${typeInfo.iconClass}`}
                                                />
                                            </div>
                                            <div>
                                                <span className="font-medium">
                                                    {tx.description}
                                                </span>
                                                <p className="text-xs text-muted-foreground">
                                                    {typeInfo.label}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span
                                                className={
                                                    isCredit
                                                        ? "font-semibold text-success"
                                                        : "font-medium text-foreground"
                                                }
                                            >
                                                {isCredit ? "+" : ""}
                                                {tx.amount}
                                            </span>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDate(tx.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}

                            {hasHiddenTransactions ? (
                                <p className="text-sm text-muted-foreground">
                                    A mostrar as 6 transacções mais recentes.
                                </p>
                            ) : null}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <History className="mb-4 h-12 w-12 text-muted-foreground/30" />
                            <h3 className="mb-2 text-lg font-medium">
                                Sem transacções ainda
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                As suas compras e consumos de crédito aparecerão
                                aqui.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex flex-col gap-4 rounded-[28px] glass glass-border p-5">
                <div className="space-y-1">
                    <h3 className="flex items-center gap-2 text-xl font-semibold">
                        <HelpCircle className="h-5 w-5 text-primary" />
                        Perguntas Frequentes
                    </h3>
                </div>
            </div>

            <Card className="glass glass-border rounded-[28px] bg-background/80">
                <CardContent className="p-6">
                    <Accordion type="single" collapsible className="w-full">
                        {faqItems.map((item, index) => (
                            <AccordionItem
                                key={item.question}
                                value={`item-${index}`}
                                className="border-border/60"
                            >
                                <AccordionTrigger className="text-left text-sm font-medium hover:no-underline hover:text-primary">
                                    {item.question}
                                </AccordionTrigger>
                                <AccordionContent className="text-sm text-muted-foreground">
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
