import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { db } from "@/lib/db";
import { apiSuccess, handleApiError, parseBody } from "@/lib/api";
import { paymentCallbackSchema } from "@/lib/validators";
import { PaymentService } from "@/lib/payments";
import { env } from "@/lib/env";

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string | undefined
): boolean {
  if (!secret) {
    console.warn("PAYMENT_WEBHOOK_SECRET not configured - rejecting callback");
    return false;
  }

  const expectedSignature = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  try {
    const providedSig = Buffer.from(signature, "hex");
    const expectedSig = Buffer.from(expectedSignature, "hex");

    if (providedSig.length !== expectedSig.length) {
      return false;
    }

    return crypto.timingSafeEqual(providedSig, expectedSig);
  } catch {
    return false;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    await params;
    const rawBody = await request.text();
    const { paymentId, providerReference, status, providerPayload, signature } =
      await parseBody(request, paymentCallbackSchema);

    if (
      !verifyWebhookSignature(
        rawBody,
        signature,
        env.PAYMENT_WEBHOOK_SECRET
      )
    ) {
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    }

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
