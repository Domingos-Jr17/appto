import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomUUID } from "crypto";
import { db } from "@/lib/db";
import { apiSuccess, handleApiError, parseBody } from "@/lib/api";
import { paymentCallbackSchema } from "@/lib/validators";
import { PaymentService, type PackageKey } from "@/lib/payments";
import { env } from "@/lib/env";

interface AuditLogEntry {
  id: string;
  timestamp: string;
  paymentId: string;
  provider: string;
  status: string;
  userId?: string;
  previousStatus?: string;
  action: "VERIFIED" | "NOT_FOUND" | "CONFIRMED" | "UPDATED" | "FAILED";
  details?: string;
}

function createAuditEntry(
  paymentId: string,
  provider: string,
  status: string,
  action: AuditLogEntry["action"],
  userId?: string,
  previousStatus?: string,
  details?: string
): AuditLogEntry {
  return {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    paymentId,
    provider,
    status,
    userId,
    previousStatus,
    action,
    details,
  };
}

function logAudit(entry: AuditLogEntry) {
  const logMessage = JSON.stringify({
    service: "payment-callback",
    ...entry,
  });
  console.log(`[AUDIT] ${logMessage}`);
}

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
    const { provider } = await params;
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
      logAudit(
        createAuditEntry(
          paymentId,
          provider,
          status,
          "FAILED",
          undefined,
          undefined,
          "Invalid webhook signature"
        )
      );
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    }

    logAudit(
      createAuditEntry(
        paymentId,
        provider,
        status,
        "VERIFIED"
      )
    );

    const existingPayment = await db.paymentTransaction.findUnique({
      where: { id: paymentId },
      select: { id: true, userId: true, status: true, provider: true, payloadJson: true },
    });

    if (!existingPayment) {
      logAudit(
        createAuditEntry(
          paymentId,
          provider,
          status,
          "NOT_FOUND",
          undefined,
          undefined,
          "Payment not found in database"
        )
      );
      console.error(`[Payment Callback] Payment not found: ${paymentId}`);
      return NextResponse.json({ error: "Payment não encontrado" }, { status: 404 });
    }

    logAudit(
      createAuditEntry(
        paymentId,
        provider,
        status,
        "VERIFIED",
        existingPayment.userId,
        existingPayment.status,
        "Processing payment"
      )
    );

    console.log(`[Payment Callback] Processing payment ${paymentId} for user ${existingPayment.userId}, status: ${status}`);

    const paymentService = new PaymentService(db);

    if (status === "CONFIRMED") {
      const paymentService = new PaymentService(db);

      const payload = existingPayment.payloadJson as Record<string, unknown> | null;
      const purchaseType = payload?.purchaseType as string | undefined;

      if (purchaseType === "extra_work") {
        const quantity = (payload?.quantity as number) || 1;
        const payment = await paymentService.confirmExtraWorkPayment(
          paymentId,
          providerReference,
          quantity
        );

        logAudit(
          createAuditEntry(
            paymentId,
            provider,
            status,
            "CONFIRMED",
            existingPayment.userId,
            existingPayment.status,
            `Extra work payment confirmed: ${quantity} works`
          )
        );

        console.log(`[Payment Callback] Extra work confirmed: ${paymentId}, quantity: ${quantity}`);
        return apiSuccess({ payment });
      }

      if (purchaseType === "subscription") {
        const packageType = (payload?.package as string) || "STARTER";
        const payment = await paymentService.confirmPackagePayment(
          paymentId,
          providerReference,
          packageType as PackageKey
        );

        logAudit(
          createAuditEntry(
            paymentId,
            provider,
            status,
            "CONFIRMED",
            existingPayment.userId,
            existingPayment.status,
            `Package upgrade confirmed: ${packageType}`
          )
        );

        console.log(`[Payment Callback] Package upgrade confirmed: ${paymentId}, package: ${packageType}`);
        return apiSuccess({ payment });
      }

      const payment = await paymentService.confirmPayment(
        paymentId,
        providerReference,
        providerPayload
      );

      logAudit(
        createAuditEntry(
          paymentId,
          provider,
          status,
          "CONFIRMED",
          existingPayment.userId,
          existingPayment.status,
          "Payment confirmed successfully"
        )
      );

      console.log(`[Payment Callback] Payment confirmed: ${paymentId}`);
      return apiSuccess({ payment });
    }

    const payment = await db.paymentTransaction.update({
      where: { id: paymentId },
      data: {
        status,
        payloadJson: providerPayload ? { providerPayload } : undefined,
      },
    });

    logAudit(
      createAuditEntry(
        paymentId,
        provider,
        status,
        "UPDATED",
        existingPayment.userId,
        existingPayment.status,
        `Status changed to ${status}`
      )
    );

    console.log(`[Payment Callback] Payment status updated: ${paymentId} -> ${status}`);
    return apiSuccess({ payment });
  } catch (error) {
    return handleApiError(error);
  }
}
