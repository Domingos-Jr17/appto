import type { PackageType } from "@prisma/client";

export type BillingPlanKey = PackageType;

export interface BillingPlan {
  key: BillingPlanKey;
  name: string;
  description: string;
  price: number;
  worksPerMonth: number;
  popular: boolean;
  features: string[];
  hasBasicAI: boolean;
  hasAdvancedAI: boolean;
  hasPdfExport: boolean;
}

export const EXTRA_WORKS = {
  price: 50,
  maxQuantityPerPurchase: 10,
  validityMonths: 3,
  consumptionPriority: "before_plan",
} as const;

export const BILLING_PLANS: Record<BillingPlanKey, BillingPlan> = {
  FREE: {
    key: "FREE",
    name: "Free",
    description: "Para experimentar o fluxo base do aptto",
    price: 0,
    worksPerMonth: 1,
    popular: false,
    hasBasicAI: false,
    hasAdvancedAI: false,
    hasPdfExport: false,
    features: [
      "1 trabalho por mês",
      "Gerar referências",
      "Exportar DOCX",
    ],
  },
  STARTER: {
    key: "STARTER",
    name: "Starter",
    description: "Ideal para uso académico regular",
    price: 100,
    worksPerMonth: 4,
    popular: true,
    hasBasicAI: true,
    hasAdvancedAI: false,
    hasPdfExport: false,
    features: [
      "4 trabalhos por mês",
      "Melhorar texto",
      "Sugestões",
      "Exportar DOCX",
    ],
  },
  PRO: {
    key: "PRO",
    name: "Pro",
    description: "Para uso intensivo com recursos premium",
    price: 200,
    worksPerMonth: 10,
    popular: false,
    hasBasicAI: true,
    hasAdvancedAI: true,
    hasPdfExport: true,
    features: [
      "10 trabalhos por mês",
      "AI completa",
      "Exportar PDF",
      "Suporte prioritário",
    ],
  },
};

export const BILLING_PLAN_DISPLAY = Object.values(BILLING_PLANS);

export function getBillingPlan(plan: BillingPlanKey) {
  return BILLING_PLANS[plan];
}
