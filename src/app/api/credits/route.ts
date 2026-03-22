import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess, handleApiError, parseBody } from "@/lib/api";
import { CREDIT_PACKAGES } from "@/lib/credits";
import { paymentCheckoutSchema } from "@/lib/validators";
import { PaymentService } from "@/lib/payments";
import { env } from "@/lib/env";
import { PaymentProvider } from "@prisma/client";

// GET /api/credits - Get user's credit balance and transactions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const { searchParams } = new URL(request.url);
    const includeTransactions = searchParams.get("transactions") === "true";

    const credits = await db.credit.findUnique({
      where: { userId: session.user.id },
      include: includeTransactions
        ? {
            user: {
              include: {
                transactions: {
                  orderBy: { createdAt: "desc" },
                  take: 50,
                },
              },
            },
          }
        : undefined,
    });

    if (!credits) {
      // Create credits if not exists
      const newCredits = await db.credit.create({
        data: {
          userId: session.user.id,
          balance: 150,
        },
      });

      return apiSuccess({
        balance: newCredits.balance,
        used: newCredits.used,
        transactions: [],
        packages: CREDIT_PACKAGES,
      });
    }

    const transactions = includeTransactions
      ? await db.creditTransaction.findMany({
          where: { userId: session.user.id },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : [];

    return apiSuccess({
      balance: credits.balance,
      used: credits.used,
      transactions,
      packages: CREDIT_PACKAGES,
    });
  } catch (error) {
    console.error("Get credits error:", error);
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const { packageKey, provider } = await parseBody(request, paymentCheckoutSchema);
    const paymentService = new PaymentService(db);
    const payment = await paymentService.createCheckout(
      session.user.id,
      (provider ?? env.PAYMENT_DEFAULT_PROVIDER) as PaymentProvider,
      packageKey
    );
    const credits = await db.credit.findUnique({
      where: { userId: session.user.id },
    });

    return apiSuccess({
      success: true,
      payment,
      balance: credits?.balance ?? 0,
      packages: CREDIT_PACKAGES,
    });
  } catch (error) {
    console.error("Purchase credits error:", error);
    return handleApiError(error, "Erro ao processar pagamento");
  }
}
