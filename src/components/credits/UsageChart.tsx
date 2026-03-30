"use client";

import * as React from "react";
import { BarChart3, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className={cn(" glass glass-border rounded-2xl bg-card/80", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <BarChart3 className="h-5 w-5 text-primary" />
            Utilização Mensal
          </CardTitle>
          <div className="flex items-center gap-1.5 text-xs text-success">
            <TrendingUp className="h-3 w-3" />
            <span>Média: {avgCredits}/mês</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
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

        {/* Summary */}
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
