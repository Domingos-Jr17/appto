import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, handleApiError, parseBody } from "@/lib/api";
import { paymentCallbackSchema } from "@/lib/validators";
import { PaymentService } from "@/lib/payments";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    await params;
    const { paymentId, providerReference, status, providerPayload } = await parseBody(
      request,
      paymentCallbackSchema
    );

    const paymentService = new PaymentService(db);

    if (status === "CONFIRMED") {
      const payment = await paymentService.confirmPayment(
        paymentId,
        providerReference,
        providerPayload
      );

      return apiSuccess({ payment });
    }

    const payment = await db.paymentTransaction.update({
      where: { id: paymentId },
      data: {
        status,
        payloadJson: providerPayload ? { providerPayload } : undefined,
      },
    });

    return apiSuccess({ payment });
  } catch (error) {
    return handleApiError(error);
  }
}
