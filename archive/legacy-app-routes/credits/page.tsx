"use client";

import * as React from "react";
import {
  Coins,
  History,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FileText,
  Zap,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
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
import { BalanceCard } from "@/components/credits/BalanceCard";
import { UsageChart } from "@/components/credits/UsageChart";
import { PaymentMethods } from "@/components/credits/PaymentMethods";

// Mock data
const usageData = [
  { month: "Ago", credits: 320 },
  { month: "Set", credits: 450 },
  { month: "Out", credits: 380 },
  { month: "Nov", credits: 520 },
  { month: "Dez", credits: 280 },
  { month: "Jan", credits: 410 },
];

const transactionHistory = [
  {
    id: "1",
    type: "usage",
    description: "Geração de monografia - UEM",
    credits: -50,
    date: "20 Jan 2024",
    balance: 2450,
  },
  {
    id: "2",
    type: "usage",
    description: "Revisão de artigo científico",
    credits: -25,
    date: "18 Jan 2024",
    balance: 2500,
  },
  {
    id: "3",
    type: "purchase",
    description: "Recarga via M-Pesa",
    credits: 1200,
    date: "15 Jan 2024",
    balance: 2525,
  },
  {
    id: "4",
    type: "usage",
    description: "Geração de referências ABNT",
    credits: -15,
    date: "12 Jan 2024",
    balance: 1325,
  },
  {
    id: "5",
    type: "usage",
    description: "Seminário - Apresentação PPT",
    credits: -35,
    date: "10 Jan 2024",
    balance: 1340,
  },
  {
    id: "6",
    type: "bonus",
    description: "Bónus de registo",
    credits: 100,
    date: "05 Jan 2024",
    balance: 1375,
  },
  {
    id: "7",
    type: "purchase",
    description: "Recarga via e-Mola",
    credits: 500,
    date: "02 Jan 2024",
    balance: 1275,
  },
];

const plans = [
  {
    name: "Starter",
    price: 250,
    credits: 500,
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
      "O custo varia por operação: geração de texto (1-5 créditos/parágrafo), criação de referências (2 créditos/referência), geração de estrutura (10 créditos), revisão de texto (3 créditos/página). O sistema sempre mostra o custo antes de confirmar.",
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
          <BalanceCard balance={2450} usageThisMonth={410} />
          <UsageChart data={usageData} />
        </div>

        {/* Right Column - Payment */}
        <div className="lg:col-span-2">
          <Card className="border-border/50 bg-card/80 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Sparkles className="h-5 w-5 text-primary" />
                Recarregar Créditos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentMethods />
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
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              Ver tudo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Descrição</TableHead>
                  <TableHead className="text-muted-foreground">Data</TableHead>
                  <TableHead className="text-muted-foreground text-right">Créditos</TableHead>
                  <TableHead className="text-muted-foreground text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionHistory.map((tx) => (
                  <TableRow key={tx.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            tx.type === "purchase"
                              ? "bg-emerald-500/10"
                              : tx.type === "bonus"
                              ? "bg-amber-500/10"
                              : "bg-sky-500/10"
                          }`}
                        >
                          {tx.type === "purchase" ? (
                            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                          ) : tx.type === "bonus" ? (
                            <Sparkles className="h-4 w-4 text-amber-500" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-sky-500" />
                          )}
                        </div>
                        <span className="font-medium">{tx.description}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{tx.date}</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          tx.credits > 0 ? "text-emerald-500" : "text-foreground"
                        }
                      >
                        {tx.credits > 0 ? "+" : ""}
                        {tx.credits}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {tx.balance.toLocaleString("pt-MZ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Plans Comparison */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <CreditCard className="h-5 w-5 text-primary" />
            Comparação de Pacotes
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
                >
                  Seleccionar
                </Button>
              </div>
            ))}
          </div>
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
