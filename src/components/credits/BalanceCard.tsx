"use client";

import * as React from "react";
import { Zap, Sparkles, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface BalanceCardProps {
    worksUsed: number;
    worksLimit: number;
    onRechargeClick?: () => void;
    className?: string;
}

export function BalanceCard({
    worksUsed,
    worksLimit,
    onRechargeClick: _onRechargeClick,
    className,
}: BalanceCardProps) {
    const router = useRouter();
    const remaining = worksLimit - worksUsed;
    const percentageUsed = worksLimit > 0 ? (worksUsed / worksLimit) * 100 : 0;

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
                        Trabalhos este mês
                    </p>
                    <div className="flex items-baseline gap-2 pt-2">
                        <span className="text-5xl font-bold tracking-tight">
                            {remaining}
                        </span>
                        <span className="text-lg text-muted-foreground">
                            restantes
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        <span className="text-foreground font-medium">
                            {worksUsed}
                        </span>{" "}
                        usados de {worksLimit} disponíveis
                    </p>
                </div>

                <div className="w-full">
                    <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full transition-all",
                                percentageUsed >= 90
                                    ? "bg-red-500"
                                    : percentageUsed >= 70
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                            )}
                            style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                        />
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 border-t border-border/60 pt-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-2xl border border-success/10 bg-success/10">
                            <FileText className="h-4 w-4 text-success" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">
                                Usados
                            </p>
                            <p className="text-sm font-semibold">
                                {worksUsed}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-2xl border border-info/10 bg-info/10">
                            <Zap className="h-4 w-4 text-info" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">
                                Limite
                            </p>
                            <p className="text-sm font-semibold">{worksLimit}</p>
                        </div>
                    </div>
                </div>

                <Button
                    className="h-14 w-full rounded-2xl text-base gap-2"
                    onClick={() => router.push("/app/subscription")}
                >
                    <Sparkles className="h-4 w-4" />
                    Ver Planos
                </Button>
            </CardContent>
        </Card>
    );
}
