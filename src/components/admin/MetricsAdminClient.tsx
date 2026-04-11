"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, RefreshCcw } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

interface FunnelSummary {
  leadMagnet: number;
  registrations: number;
  checkoutStarted: number;
  paymentsConfirmed: number;
  exportsSaved: number;
}

interface MetricsResponse {
  funnel: FunnelSummary;
  grouped: Array<{ name: string; _count: { name: number } }>;
}

export function MetricsAdminClient() {
  const { toast } = useToast();
  const t = useTranslations("admin.metrics");
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/metrics/summary");
      const next = await response.json();
      if (!response.ok) {
        throw new Error(next.error || t("errors.loadMetrics"));
      }
      setData(next);
    } catch (error) {
      toast({
        title: t("errors.error"),
        description: error instanceof Error ? error.message : t("errors.loadMetrics"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const funnel = data?.funnel || {
    leadMagnet: 0,
    registrations: 0,
    checkoutStarted: 0,
    paymentsConfirmed: 0,
    exportsSaved: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void refresh()}>
          <RefreshCcw className="mr-2 h-4 w-4" /> {t("refresh")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        {[
          { label: t("funnel.leadMagnet"), value: funnel.leadMagnet },
          { label: t("funnel.registrations"), value: funnel.registrations },
          { label: t("funnel.checkouts"), value: funnel.checkoutStarted },
          { label: t("funnel.payments"), value: funnel.paymentsConfirmed },
          { label: t("funnel.exports"), value: funnel.exportsSaved },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-2xl">{item.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> {t("eventsCard.title")}</CardTitle>
          <CardDescription>{t("eventsCard.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t("eventsCard.loading")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("eventsCard.event")}</TableHead>
                  <TableHead>{t("eventsCard.total")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.grouped || []).map((item) => (
                  <TableRow key={item.name}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item._count.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
