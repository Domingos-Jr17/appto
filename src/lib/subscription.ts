import { ApiRouteError } from "@/lib/api";
import { db } from "@/lib/db";
import { sendLowCreditsAlert } from "@/lib/email";
import { SubscriptionStatus, PackageType, type PrismaClient } from "@prisma/client";
import { BILLING_PLANS, EXTRA_WORKS } from "@/lib/billing";

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

export const PACKAGE_PRICES: Record<PackageType, Omit<PackageDetails, "key">> = BILLING_PLANS;

export type AIAction = "generate" | "improve" | "suggest" | "references" | "outline" | "chat" | "summarize" | "translate" | "citations" | "plagiarism-check" | "generate-section" | "generate-complete";

export const FREE_AI_ACTIONS: AIAction[] = ["references", "outline"];
export const BASIC_AI_ACTIONS: AIAction[] = ["generate", "improve", "suggest", "references", "outline", "chat", "summarize", "translate"];
export const ADVANCED_AI_ACTIONS: AIAction[] = ["citations", "plagiarism-check", "generate-section", "generate-complete"];

export const EXTRA_WORK_PRICE = EXTRA_WORKS.price;

export class SubscriptionService {
  private readonly dbClient: PrismaClient | any;

  constructor(dbClient?: PrismaClient | any) {
    this.dbClient = dbClient ?? db;
  }

  async getOrCreate(userId: string) {
    let subscription = await this.dbClient.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      subscription = await this.dbClient.subscription.create({
        data: {
          userId,
          package: PackageType.FREE,
          status: SubscriptionStatus.ACTIVE,
          worksPerMonth: PACKAGE_PRICES.FREE.worksPerMonth,
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
    const crossedCalendarMonth =
      now.getUTCFullYear() !== lastReset.getUTCFullYear() ||
      now.getUTCMonth() !== lastReset.getUTCMonth();

    if (crossedCalendarMonth) {
      await this.dbClient.subscription.update({
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
    const purchases = await this.dbClient.workPurchase.findMany({
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
    const planDetails = PACKAGE_PRICES[subscription.package as PackageType];

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      return { allowed: false, reason: "Subscription inativa" };
    }

    const isFreeAction = FREE_AI_ACTIONS.includes(action);
    const isBasicAction = BASIC_AI_ACTIONS.includes(action);
    const isAdvancedAction = ADVANCED_AI_ACTIONS.includes(action);

    if (subscription.package === PackageType.FREE) {
      if (isFreeAction) {
        return { allowed: true };
      }

      return { allowed: false, reason: "Funcionalidade disponível apenas em STARTER ou PRO" };
    }

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
    const planDetails = PACKAGE_PRICES[subscription.package as PackageType];

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
    // Step 1: Reset monthly usage if needed (idempotent)
    await this.checkAndResetMonthlyUsage(userId);

    // Step 2: Try to consume from extra works first (atomic)
    const extraWorks = await this.getAvailableExtraWorks(userId);

    if (extraWorks > 0) {
      const now = new Date();
      const purchases = await this.dbClient.workPurchase.findMany({
        where: {
          userId,
          expiresAt: { gt: now },
        },
        orderBy: { expiresAt: "asc" },
      });

      for (const purchase of purchases) {
        const updated = await this.dbClient.workPurchase.updateMany({
          where: {
            id: purchase.id,
            used: { lt: purchase.quantity },
          },
          data: { used: { increment: 1 } },
        });

        if (updated.count === 1) {
          await this.checkAndSendLowCreditsAlert(userId);
          return;
        }
      }
    }

    // Step 3: Try to consume from plan (atomic — field-to-field comparison)
    // Uses raw SQL to compare worksUsed < worksPerMonth atomically,
    // preventing race conditions under concurrent requests.
    const result = await this.dbClient.$executeRaw`
      UPDATE "Subscription"
      SET "worksUsed" = "worksUsed" + 1
      WHERE "userId" = ${userId}
        AND "worksUsed" < "worksPerMonth"
    `;

    if (result === 1) {
      await this.checkAndSendLowCreditsAlert(userId);
      return;
    }

    throw new ApiRouteError("Limite de trabalhos atingido", 403, "WORK_LIMIT_REACHED");
  }

  private async checkAndSendLowCreditsAlert(userId: string): Promise<void> {
    try {
      const subscription = await this.getOrCreate(userId);
      const planRemaining = subscription.worksPerMonth - subscription.worksUsed;
      const extraWorks = await this.getAvailableExtraWorks(userId);
      const remaining = planRemaining + extraWorks;

      if (remaining <= 1) {
        const user = await this.dbClient.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true },
        });

        if (user) {
          sendLowCreditsAlert(user.email, user.name, {
            remaining,
            total: subscription.worksPerMonth,
          }).catch(() => null);
        }
      }
    } catch {
      // Silently fail - alert is non-critical
    }
  }

  async refundWork(userId: string): Promise<void> {
    const now = new Date();
    const purchaseToRefund = await this.dbClient.workPurchase.findFirst({
      where: {
        userId,
        used: { gt: 0 },
        expiresAt: { gt: now },
      },
      orderBy: { expiresAt: "desc" },
    });

    if (purchaseToRefund) {
      await this.dbClient.workPurchase.update({
        where: { id: purchaseToRefund.id },
        data: {
          used: { decrement: 1 },
        },
      });
      return;
    }

    const subscription = await this.getOrCreate(userId);
    if (subscription.worksUsed > 0) {
      await this.dbClient.subscription.update({
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
      throw new ApiRouteError("Pacote inválido", 400, "INVALID_PACKAGE");
    }

    const currentSubscription = await this.getOrCreate(userId);
    const currentPackageDetails = PACKAGE_PRICES[currentSubscription.package as PackageType];

    let newWorksUsed = 0;

    // Se for downgrade, converter trabalhos usados em extras
    if (currentSubscription.package !== packageType) {
      const isDowngrade = packageDetails.worksPerMonth < currentPackageDetails.worksPerMonth;

      if (isDowngrade && currentSubscription.worksUsed > 0) {
        const excessWorks = Math.max(0, currentSubscription.worksUsed - packageDetails.worksPerMonth);

        if (excessWorks > 0) {
          // Expira no próximo reset do ciclo mensal
          const expiresAt = new Date(currentSubscription.lastUsageReset);
          expiresAt.setMonth(expiresAt.getMonth() + 1);

          await this.dbClient.workPurchase.create({
            data: {
              userId,
              quantity: excessWorks,
              pricePaid: 0,
              used: 0,
              expiresAt,
            },
          });

          newWorksUsed = 0;
        } else {
          newWorksUsed = currentSubscription.worksUsed;
        }
      }
    }

    await this.dbClient.subscription.update({
      where: { userId },
      data: {
        package: packageType,
        worksPerMonth: packageDetails.worksPerMonth,
        worksUsed: newWorksUsed,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(),
        endDate: null,
      },
    });
  }

  async cancelSubscription(userId: string): Promise<void> {
    await this.dbClient.subscription.update({
      where: { userId },
      data: {
        status: SubscriptionStatus.CANCELLED,
        endDate: new Date(),
      },
    });
  }

  async getSubscriptionStatus(userId: string) {
    const subscription = await this.checkAndResetMonthlyUsage(userId);
    const planDetails = PACKAGE_PRICES[subscription.package as PackageType];
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
