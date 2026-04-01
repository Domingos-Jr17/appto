"use client";

import * as React from "react";
import { TrendingUp, Zap, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BalanceCardProps {
    balance: number;
    usageThisMonth: number;
    onRechargeClick?: () => void;
    className?: string;
}

export function BalanceCard({
    balance,
    usageThisMonth,
    onRechargeClick,
    className,
}: BalanceCardProps) {
    const estimatedWork = Math.floor(balance / 50);

    return (
        <Card
            className={cn(
                "glass glass-border relative overflow-hidden rounded-[28px] border-primary/20 bg-gradient-to-br from-primary/10 via-background/80 to-background/80",
                className,
            )}
        >
            <CardContent className="relative z-10 space-y-6 p-6">
                <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Saldo de Créditos
                    </p>
                    <div className="flex items-baseline gap-2 pt-2">
                        <span className="text-5xl font-bold tracking-tight">
                            {balance.toLocaleString("pt-MZ")}
                        </span>
                        <span className="text-lg text-muted-foreground">
                            créditos
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Aproximadamente{" "}
                        <span className="text-foreground font-medium">
                            {estimatedWork} trabalhos
                        </span>{" "}
                        disponíveis
                    </p>
                </div>

                <div className="flex flex-wrap gap-4 border-t border-border/60 pt-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-2xl border border-success/10 bg-success/10">
                            <TrendingUp className="h-4 w-4 text-success" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">
                                Usados este mês
                            </p>
                            <p className="text-sm font-semibold">
                                {usageThisMonth.toLocaleString("pt-MZ")}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-2xl border border-info/10 bg-info/10">
                            <Zap className="h-4 w-4 text-info" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">
                                Créditos/trabalho
                            </p>
                            <p className="text-sm font-semibold">~50</p>
                        </div>
                    </div>
                </div>

                <Button className="h-14 w-full rounded-2xl text-base gap-2" onClick={onRechargeClick}>
                    <Sparkles className="h-4 w-4" />
                    Recarregar Créditos
                </Button>
            </CardContent>
        </Card>
    );
}
