import { db } from "@/lib/db";
import { SubscriptionStatus, PlanType } from "@prisma/client";

export interface PlanDetails {
  key: PlanType;
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

export const PLAN_PRICES: Record<PlanType, Omit<PlanDetails, "key">> = {
  FREE: {
    name: "Free",
    description: "Para experimentar",
    price: 0,
    worksPerMonth: 1,
    popular: false,
    hasBasicAI: true,
    hasAdvancedAI: true,
    hasPdfExport: false,
    features: [
      "1 trabalho por mês",
      "Gerar referências",
      "Exportar DOCX",
    ],
  },
  STARTER: {
    name: "Starter",
    description: "Uso regular",
    price: 100,
    worksPerMonth: 4,
    popular: true,
    hasBasicAI: true,
    hasAdvancedAI: true,
    hasPdfExport: false,
    features: [
      "4 trabalhos por mês",
      "Gerar referências",
      "Melhorar texto",
      "Sugestões",
      "Exportar DOCX",
    ],
  },
  PRO: {
    name: "Pro",
    description: "Uso intensivo",
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

export type AIAction = "improve" | "suggest" | "references" | "outline" | "chat" | "summarize" | "translate" | "citations" | "plagiarism-check" | "generate-section";

export const BASIC_AI_ACTIONS: AIAction[] = ["improve", "suggest", "references", "outline", "chat", "summarize", "translate"];
export const ADVANCED_AI_ACTIONS: AIAction[] = ["citations", "plagiarism-check", "generate-section"];

export const EXTRA_WORK_PRICE = 50;

export class SubscriptionService {
  async getOrCreate(userId: string) {
    let subscription = await db.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      subscription = await db.subscription.create({
        data: {
          userId,
          plan: PlanType.FREE,
          status: SubscriptionStatus.ACTIVE,
          worksPerMonth: 1,
          worksUsed: 0,
          lastUsageReset: new Date(),
        },
      });
    }

    return subscription;
  }

  async checkAndResetMonthlyUsage(userId: string) {
    const subscription = await this.getOrCreate(userId);
    const now = new Date();
    const lastReset = new Date(subscription.lastUsageReset);

    const daysSinceReset = Math.floor(
      (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceReset >= 30) {
      await db.subscription.update({
        where: { userId },
        data: {
          worksUsed: 0,
          lastUsageReset: now,
        },
      });
      return { ...subscription, worksUsed: 0, lastUsageReset: now };
    }

    return subscription;
  }

  async canGenerateWork(userId: string): Promise<{ allowed: boolean; reason?: string; remaining: number }> {
    const subscription = await this.checkAndResetMonthlyUsage(userId);

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      return { allowed: false, reason: "Subscription inativa", remaining: 0 };
    }

    const remaining = subscription.worksPerMonth - subscription.worksUsed;

    if (remaining <= 0) {
      return { allowed: false, reason: "Limite de trabalhos atingido", remaining: 0 };
    }

    return { allowed: true, remaining };
  }

  async canUseAIAction(userId: string, action: AIAction): Promise<{ allowed: boolean; reason?: string }> {
    const subscription = await this.getOrCreate(userId);
    const planDetails = PLAN_PRICES[subscription.plan];

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      return { allowed: false, reason: "Subscription inativa" };
    }

    const isBasicAction = BASIC_AI_ACTIONS.includes(action);
    const isAdvancedAction = ADVANCED_AI_ACTIONS.includes(action);

    if (isBasicAction && planDetails.hasBasicAI) {
      return { allowed: true };
    }

    if (isAdvancedAction && planDetails.hasAdvancedAI) {
      return { allowed: true };
    }

    if (isBasicAction) {
      return { allowed: false, reason: "Funcionalidade disponível apenas em STARTER ou PRO" };
    }

    return { allowed: false, reason: "Funcionalidade disponível apenas em PRO" };
  }

  async canExportPdf(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const subscription = await this.getOrCreate(userId);
    const planDetails = PLAN_PRICES[subscription.plan];

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      return { allowed: false, reason: "Subscription inativa" };
    }

    if (planDetails.hasPdfExport) {
      return { allowed: true };
    }

    return { allowed: false, reason: "Export PDF disponível apenas em PRO" };
  }

  getPlanFeatures(plan: PlanType): PlanDetails {
    return {
      key: plan,
      ...PLAN_PRICES[plan],
    };
  }

  async consumeWork(userId: string): Promise<void> {
    const subscription = await this.checkAndResetMonthlyUsage(userId);

    const remaining = subscription.worksPerMonth - subscription.worksUsed;

    if (remaining <= 0) {
      throw new Error("Limite de trabalhos atingido");
    }

    await db.subscription.update({
      where: { userId },
      data: {
        worksUsed: { increment: 1 },
      },
    });
  }

  async refundWork(userId: string): Promise<void> {
    const subscription = await this.getOrCreate(userId);

    if (subscription.worksUsed > 0) {
      await db.subscription.update({
        where: { userId },
        data: {
          worksUsed: { decrement: 1 },
        },
      });
    }
  }

  async upgradePlan(userId: string, plan: PlanType): Promise<void> {
    const planDetails = PLAN_PRICES[plan];
    if (!planDetails) {
      throw new Error("Plano inválido");
    }

    await this.getOrCreate(userId);

    await db.subscription.update({
      where: { userId },
      data: {
        plan,
        worksPerMonth: planDetails.worksPerMonth,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(),
        endDate: null,
      },
    });
  }

  async cancelSubscription(userId: string): Promise<void> {
    await db.subscription.update({
      where: { userId },
      data: {
        status: SubscriptionStatus.CANCELLED,
        endDate: new Date(),
      },
    });
  }

  async getSubscriptionStatus(userId: string) {
    const subscription = await this.checkAndResetMonthlyUsage(userId);
    const planDetails = PLAN_PRICES[subscription.plan];

    return {
      plan: subscription.plan,
      status: subscription.status,
      worksPerMonth: subscription.worksPerMonth,
      worksUsed: subscription.worksUsed,
      remaining: subscription.worksPerMonth - subscription.worksUsed,
      lastReset: subscription.lastUsageReset,
      name: planDetails.name,
      description: planDetails.description,
      price: planDetails.price,
      popular: planDetails.popular,
      features: planDetails.features,
    };
  }
}

export const subscriptionService = new SubscriptionService();
