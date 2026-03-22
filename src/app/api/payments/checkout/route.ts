import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess, handleApiError, parseBody } from "@/lib/api";
import { paymentCheckoutSchema } from "@/lib/validators";
import { PaymentService } from "@/lib/payments";
import { PaymentProvider } from "@prisma/client";
import { env } from "@/lib/env";

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

    return apiSuccess({
      payment: {
        id: payment.id,
        provider: payment.provider,
        status: payment.status,
        providerReference: payment.providerReference,
        creditsAmount: payment.creditsAmount,
        moneyAmount: payment.moneyAmount,
        currency: payment.currency,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
