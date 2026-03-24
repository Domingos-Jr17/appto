"use client";

import * as React from "react";
import { Coins, TrendingUp, Zap, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BalanceCardProps {
  balance: number;
  usageThisMonth: number;
  className?: string;
}

export function BalanceCard({ balance, usageThisMonth, className }: BalanceCardProps) {
  const estimatedWork = Math.floor(balance / 50);

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card",
        className
      )}
    >
      {/* Decorative elements - behind content */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <CardHeader className="relative z-10 pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Coins className="h-5 w-5 text-primary" />
          Saldo de Créditos
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10 space-y-6">
        {/* Main Balance */}
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold tracking-tight gradient-text">
              {balance.toLocaleString("pt-MZ")}
            </span>
            <span className="text-lg text-muted-foreground">créditos</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Aproximadamente <span className="text-foreground font-medium">{estimatedWork} trabalhos</span> disponíveis
          </p>
        </div>

        {/* Stats Row */}
        <div className="flex flex-wrap gap-4 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 backdrop-blur-xl border border-success/10">
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Usados este mês</p>
              <p className="text-sm font-semibold">{usageThisMonth.toLocaleString("pt-MZ")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10 backdrop-blur-xl border border-info/10">
              <Zap className="h-4 w-4 text-info" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Créditos/trabalho</p>
              <p className="text-sm font-semibold">~50</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <Button className="w-full gap-2 gradient-primary text-primary-foreground hover:opacity-90">
          <Sparkles className="h-4 w-4" />
          Recarregar Créditos
        </Button>
      </CardContent>
    </Card>
  );
}
