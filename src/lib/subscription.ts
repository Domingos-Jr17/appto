import { db } from "@/lib/db";
import { SubscriptionStatus, PackageType } from "@prisma/client";

export interface PackageDetails {
  key: PackageType;
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

export const PACKAGE_PRICES: Record<PackageType, Omit<PackageDetails, "key">> = {
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

export type AIAction = "generate" | "improve" | "suggest" | "references" | "outline" | "chat" | "summarize" | "translate" | "citations" | "plagiarism-check" | "generate-section" | "generate-complete";

export const BASIC_AI_ACTIONS: AIAction[] = ["generate", "improve", "suggest", "references", "outline", "chat", "summarize", "translate"];
export const ADVANCED_AI_ACTIONS: AIAction[] = ["citations", "plagiarism-check", "generate-section", "generate-complete"];

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
          package: PackageType.FREE,
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

  async getAvailableExtraWorks(userId: string): Promise<number> {
    const now = new Date();
    const purchases = await db.workPurchase.findMany({
      where: {
        userId,
        expiresAt: { gt: now },
      },
    });

    let total = 0;
    for (const p of purchases) {
      total += p.quantity - (p.used || 0);
    }
    return Math.max(0, total);
  }

  async canGenerateWork(userId: string): Promise<{ allowed: boolean; reason?: string; remaining: number }> {
    const subscription = await this.checkAndResetMonthlyUsage(userId);

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      return { allowed: false, reason: "Subscription inativa", remaining: 0 };
    }

    const planRemaining = subscription.worksPerMonth - subscription.worksUsed;
    const extraWorks = await this.getAvailableExtraWorks(userId);
    const remaining = planRemaining + extraWorks;

    if (remaining <= 0) {
      return { allowed: false, reason: "Limite de trabalhos atingido", remaining: 0 };
    }

    return { allowed: true, remaining };
  }

  async canUseAIAction(userId: string, action: AIAction): Promise<{ allowed: boolean; reason?: string }> {
    const subscription = await this.getOrCreate(userId);
    const planDetails = PACKAGE_PRICES[subscription.package];

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
    const planDetails = PACKAGE_PRICES[subscription.package];

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      return { allowed: false, reason: "Subscription inativa" };
    }

    if (planDetails.hasPdfExport) {
      return { allowed: true };
    }

    return { allowed: false, reason: "Export PDF disponível apenas em PRO" };
  }

  getPackageFeatures(packageType: PackageType): PackageDetails {
    return {
      key: packageType,
      ...PACKAGE_PRICES[packageType],
    };
  }

  async consumeWork(userId: string): Promise<void> {
    const subscription = await this.checkAndResetMonthlyUsage(userId);

    const planRemaining = subscription.worksPerMonth - subscription.worksUsed;

    if (planRemaining > 0) {
      await db.subscription.update({
        where: { userId },
        data: {
          worksUsed: { increment: 1 },
        },
      });
      return;
    }

    const extraWorks = await this.getAvailableExtraWorks(userId);
    if (extraWorks <= 0) {
      throw new Error("Limite de trabalhos atingido");
    }

    const now = new Date();
    const purchases = await db.workPurchase.findMany({
      where: {
        userId,
        expiresAt: { gt: now },
      },
      orderBy: { expiresAt: "asc" },
    });

    for (const p of purchases) {
      const available = p.quantity - (p.used || 0);
      if (available > 0) {
        await db.workPurchase.update({
          where: { id: p.id },
          data: { used: { increment: 1 } },
        });
        return;
      }
    }

    throw new Error("Limite de trabalhos atingido");
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

  async activatePackage(userId: string, packageType: PackageType): Promise<void> {
    const packageDetails = PACKAGE_PRICES[packageType];
    if (!packageDetails) {
      throw new Error("Pacote inválido");
    }

    await this.getOrCreate(userId);

    await db.subscription.update({
      where: { userId },
      data: {
        package: packageType,
        worksPerMonth: packageDetails.worksPerMonth,
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
    const planDetails = PACKAGE_PRICES[subscription.package];
    const extraWorks = await this.getAvailableExtraWorks(userId);
    const planRemaining = subscription.worksPerMonth - subscription.worksUsed;

    return {
      package: subscription.package,
      status: subscription.status,
      worksPerMonth: subscription.worksPerMonth,
      worksUsed: subscription.worksUsed,
      planRemaining,
      extraWorks,
      remaining: planRemaining + extraWorks,
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
