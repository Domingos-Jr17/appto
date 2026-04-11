import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { PaymentProvider, PackageType } from "@prisma/client";
import { z } from "zod";

import { apiError, apiSuccess, handleApiError, ApiRouteError, parseBody } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { BILLING_PLAN_DISPLAY, EXTRA_WORKS } from "@/lib/billing";
import { db } from "@/lib/db";
import { withDistributedLock } from "@/lib/distributed-lock";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { PaymentService } from "@/lib/payments";
import { trackProductEvent } from "@/lib/product-events";
import { enforceRateLimit } from "@/lib/rate-limit";
import { subscriptionService } from "@/lib/subscription";

const activatePackageSchema = z.object({
  package: z.enum(["STARTER", "PRO"]),
  provider: z.enum(["SIMULATED", "MPESA", "EMOLA"]).optional(),
});

const purchaseExtraSchema = z.object({
  quantity: z.number().int().min(1).max(EXTRA_WORKS.maxQuantityPerPurchase),
  provider: z.enum(["SIMULATED", "MPESA", "EMOLA"]).optional(),
});

const subscriptionActionSchema = z.union([activatePackageSchema, purchaseExtraSchema]);

function serializePaymentTransaction(payment: {
  id: string;
  moneyAmount: number;
  currency: string;
  status: string;
  provider: string;
  createdAt: Date;
  confirmedAt: Date | null;
  payloadJson: unknown;
}) {
  const payload = payment.payloadJson && typeof payment.payloadJson === "object"
    ? (payment.payloadJson as Record<string, unknown>)
    : {};

  return {
    id: payment.id,
    amount: payment.moneyAmount,
    currency: payment.currency,
    status: payment.status,
    provider: payment.provider,
    createdAt: payment.createdAt,
    confirmedAt: payment.confirmedAt,
    purchaseType: typeof payload.purchaseType === "string" ? payload.purchaseType : null,
    package: typeof payload.package === "string" ? payload.package : null,
    quantity: typeof payload.quantity === "number" ? payload.quantity : null,
  };
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const subscriptionStatus = await subscriptionService.getSubscriptionStatus(session.user.id);

    const [extraWorks, recentTransactions] = await Promise.all([
      db.workPurchase.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
      }),
      db.paymentTransaction.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    return apiSuccess({
      subscription: subscriptionStatus,
      extraWorks,
      plans: BILLING_PLAN_DISPLAY,
      extraWorkPrice: EXTRA_WORKS.price,
      transactions: recentTransactions.map(serializePaymentTransaction),
      nextResetDate: subscriptionStatus.lastReset
        ? new Date(
            Date.UTC(
              new Date(subscriptionStatus.lastReset).getUTCFullYear(),
              new Date(subscriptionStatus.lastReset).getUTCMonth() + 1,
              1,
            ),
          )
        : null,
    });
  } catch (error) {
    logger.error("Get subscription error", { error: String(error) });
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    await enforceRateLimit(`subscription:${session.user.id}`, 10, 60 * 1000);

    const body = await parseBody(request, subscriptionActionSchema);
    const providerValue = (body.provider ?? env.PAYMENT_DEFAULT_PROVIDER) as PaymentProvider;

    const payment = await withDistributedLock(
      `subscription:${session.user.id}`,
      15_000,
      async () => {
        const paymentService = new PaymentService(db);

        if ("package" in body) {
          const validPackage = PackageType[body.package as keyof typeof PackageType];
          if (!validPackage || validPackage === PackageType.FREE) {
            throw new ApiRouteError("Invalid package", 400, "INVALID_PACKAGE");
          }

          return paymentService.createPackageCheckout(session.user.id, providerValue, validPackage);
        }

        if ("quantity" in body) {
          return paymentService.createExtraWorkCheckout(session.user.id, providerValue, body.quantity);
        }

        throw new ApiRouteError("Invalid parameters. Provide 'package' or 'quantity'", 400, "INVALID_SUBSCRIPTION_ACTION");
      },
      "A package/payment operation is already in progress. Please wait a moment.",
    );

    if ("package" in body) {
      await trackProductEvent({
        name: "subscription_checkout_started",
        category: "billing",
        userId: session.user.id,
        paymentId: payment.id,
        metadata: { package: body.package, provider: providerValue },
      }).catch(() => null);

      return apiSuccess({
        success: true,
        payment,
        message:
          payment.status === "CONFIRMED"
            ? `${body.package} package activated successfully`
            : `Checkout started for the ${body.package} package`,
      });
    }

    await trackProductEvent({
      name: "extra_work_checkout_started",
      category: "billing",
      userId: session.user.id,
      paymentId: payment.id,
      metadata: { quantity: body.quantity, provider: providerValue },
    }).catch(() => null);

    return apiSuccess({
      success: true,
      payment,
      message:
        payment.status === "CONFIRMED"
          ? `${body.quantity} extra work item(s) added successfully`
          : `Checkout started for ${body.quantity} extra work item(s)`,
    });
  } catch (error) {
    logger.error("Subscription POST error", { error: String(error) });
    return handleApiError(error, "Failed to process subscription");
  }
}

export async function DELETE(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    await subscriptionService.cancelSubscription(session.user.id);

    return apiSuccess({
      success: true,
      message: "Subscription canceled successfully",
    });
  } catch (error) {
    logger.error("Cancel subscription error", { error: String(error) });
    return handleApiError(error);
  }
}
