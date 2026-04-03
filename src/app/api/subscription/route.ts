import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess, handleApiError, parseBody } from "@/lib/api";
import { BILLING_PLAN_DISPLAY, EXTRA_WORKS } from "@/lib/billing";
import { PaymentService } from "@/lib/payments";
import { subscriptionService } from "@/lib/subscription";
import { env } from "@/lib/env";
import { PaymentProvider, PackageType } from "@prisma/client";
import { z } from "zod";

const activatePackageSchema = z.object({
  package: z.enum(["STARTER", "PRO"]),
  provider: z.enum(["SIMULATED", "MPESA", "EMOLA"]).optional(),
});

const purchaseExtraSchema = z.object({
  quantity: z.number().int().min(1).max(EXTRA_WORKS.maxQuantityPerPurchase),
  provider: z.enum(["SIMULATED", "MPESA", "EMOLA"]).optional(),
});

const subscriptionActionSchema = z.union([activatePackageSchema, purchaseExtraSchema]);

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
      plans: BILLING_PLAN_DISPLAY,
      extraWorkPrice: EXTRA_WORKS.price,
      paymentGateway: env.PAYMENT_GATEWAY,
      paymentDefaultProvider: env.PAYMENT_DEFAULT_PROVIDER,
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

    const body = await parseBody(request, subscriptionActionSchema);
    const providerValue = (body.provider ?? env.PAYMENT_DEFAULT_PROVIDER) as PaymentProvider;

    const paymentService = new PaymentService(db);

    if ("package" in body) {
      const validPackage = PackageType[body.package as keyof typeof PackageType];
      if (!validPackage) {
        return apiError("Pacote inválido", 400);
      }

      if (validPackage === PackageType.FREE) {
        return apiError("Não pode activar o pacote Free", 400);
      }

      const payment = await paymentService.createPackageCheckout(
        session.user.id,
        providerValue,
        validPackage
      );

      return apiSuccess({
        success: true,
        payment,
        message:
          payment.status === "CONFIRMED"
            ? `Pacote ${body.package} ativado com sucesso`
            : `Checkout iniciado para o pacote ${body.package}`,
      });
    }

    if ("quantity" in body) {
      const payment = await paymentService.createExtraWorkCheckout(
        session.user.id,
        providerValue,
        body.quantity
      );

      return apiSuccess({
        success: true,
        payment,
        message:
          payment.status === "CONFIRMED"
            ? `${body.quantity} trabalho(s) extra(s) adicionado(s) com sucesso`
            : `Checkout iniciado para ${body.quantity} trabalho(s) extra(s)`,
      });
    }

    return apiError("Parâmetros inválidos. Forneça 'package' ou 'quantity'", 400);
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
