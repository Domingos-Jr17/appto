"use client";

import * as React from "react";
import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";

interface UsageData {
  month: string;
  credits: number;
}

interface UsageChartProps {
  data: UsageData[];
  className?: string;
}

const chartConfig = {
  credits: {
    label: "Créditos",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function UsageChart({ data, className }: UsageChartProps) {
  const totalCredits = data.reduce((sum, item) => sum + item.credits, 0);
  const avgCredits = Math.round(totalCredits / data.length);

  return (
    <Card className={cn("glass glass-border rounded-[28px] bg-background/80", className)}>
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Utilização Mensal
          </p>
          <div className="flex items-center gap-1.5 text-xs text-success">
            <TrendingUp className="h-3 w-3" />
            <span>Média: {avgCredits}/mês</span>
          </div>
        </div>

        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="bg-card border-border"
                  labelClassName="text-foreground"
                />
              }
            />
            <Bar
              dataKey="credits"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              className="fill-primary/80 hover:fill-primary transition-colors"
            />
          </BarChart>
        </ChartContainer>

        <div className="mt-4 border-t border-border/60 pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total utilizado (6 meses)</span>
            <span className="font-semibold">{totalCredits.toLocaleString("pt-MZ")} créditos</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
