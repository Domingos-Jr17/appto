import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess, handleApiError, parseBody as _parseBody } from "@/lib/api";
import { PLAN_DISPLAY, PLAN_PRICING as _PLAN_PRICING, EXTRA_WORK_PRICE } from "@/lib/credits";
import { PaymentService } from "@/lib/payments";
import { subscriptionService } from "@/lib/subscription";
import { env } from "@/lib/env";
import { PaymentProvider, PlanType } from "@prisma/client";
import { z } from "zod";

const _activatePackageSchema = z.object({
  plan: z.enum(["STARTER", "PRO"]),
  provider: z.enum(["SIMULATED", "MPESA", "EMOLA"]).optional(),
});

const _purchaseExtraSchema = z.object({
  quantity: z.number().min(1).max(10),
  provider: z.enum(["SIMULATED", "MPESA", "EMOLA"]).optional(),
});

// GET /api/subscription - Get user's subscription status
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const subscriptionStatus = await subscriptionService.getSubscriptionStatus(session.user.id);

    const extraWorks = await db.workPurchase.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    const recentTransactions = await db.paymentTransaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return apiSuccess({
      subscription: subscriptionStatus,
      extraWorks,
      plans: PLAN_DISPLAY,
      extraWorkPrice: EXTRA_WORK_PRICE,
      transactions: recentTransactions,
      nextResetDate: subscriptionStatus.lastReset 
        ? new Date(new Date(subscriptionStatus.lastReset).getTime() + 30 * 24 * 60 * 60 * 1000)
        : null,
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    return handleApiError(error);
  }
}

// POST /api/subscription - Activate package or purchase extra works
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const body = await request.json();
    const { plan, quantity, provider } = body;

    const paymentService = new PaymentService(db);
    const providerValue = (provider ?? env.PAYMENT_DEFAULT_PROVIDER) as PaymentProvider;

    if (plan) {
      const validPlan = PlanType[plan as keyof typeof PlanType];
      if (!validPlan) {
        return apiError("Pacote inválido", 400);
      }

      if (validPlan === PlanType.FREE) {
        return apiError("Não pode activar o pacote Free", 400);
      }

      const payment = await paymentService.createPackageCheckout(
        session.user.id,
        providerValue,
        validPlan
      );

      return apiSuccess({
        success: true,
        payment,
        message: `Pacote ${plan} ativado com sucesso`,
      });
    }

    if (quantity) {
      if (quantity < 1 || quantity > 10) {
        return apiError("Quantidade inválida. Mínimo: 1, Máximo: 10", 400);
      }

      const payment = await paymentService.createExtraWorkCheckout(
        session.user.id,
        providerValue,
        quantity
      );

      return apiSuccess({
        success: true,
        payment,
        message: `${quantity} trabalho(s) extra(s) adicionado(s) com sucesso`,
      });
    }

    return apiError("Parâmetros inválidos. Forneça 'plan' ou 'quantity'", 400);
  } catch (error) {
    console.error("Subscription POST error:", error);
    return handleApiError(error, "Erro ao processarSubscription");
  }
}

// DELETE /api/subscription - Cancel subscription
export async function DELETE(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    await subscriptionService.cancelSubscription(session.user.id);

    return apiSuccess({
      success: true,
      message: "Subscription cancelada com sucesso",
    });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return handleApiError(error);
  }
}
