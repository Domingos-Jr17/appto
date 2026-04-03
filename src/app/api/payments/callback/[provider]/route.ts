import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { PackageType, PaymentStatus } from "@prisma/client";

import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { normalizePaymentCallback, verifyWebhookSignature } from "@/lib/payment-gateway";
import { PaymentService } from "@/lib/payments";

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? null));
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  paymentId: string;
  provider: string;
  status: string;
  userId?: string;
  previousStatus?: string;
  action: "VERIFIED" | "NOT_FOUND" | "CONFIRMED" | "UPDATED" | "FAILED" | "DUPLICATE";
  details?: string;
}

function createAuditEntry(
  paymentId: string,
  provider: string,
  status: string,
  action: AuditLogEntry["action"],
  userId?: string,
  previousStatus?: string,
  details?: string,
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
  console.log(
    `[AUDIT] ${JSON.stringify({
      service: "payment-callback",
      ...entry,
    })}`,
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider } = await params;
    const rawBody = await request.text();
    const signatureHeader = request.headers.get("x-webhook-signature");
    const parsedBody = JSON.parse(rawBody || "{}");
    const normalized = normalizePaymentCallback(parsedBody, {
      signature: signatureHeader ?? parsedBody?.signature,
      rawBody,
    });

    const mustVerifySignature = env.PAYMENT_GATEWAY === "PAYSUITE" || provider !== "simulated";
    if (
      mustVerifySignature &&
      !verifyWebhookSignature(rawBody, normalized.signature, env.PAYMENT_WEBHOOK_SECRET)
    ) {
      logAudit(
        createAuditEntry(
          normalized.paymentId,
          provider,
          normalized.status,
          "FAILED",
          undefined,
          undefined,
          "Invalid webhook signature",
        ),
      );
      return apiError("Assinatura inválida", 401);
    }

    const existingPayment = await db.paymentTransaction.findUnique({
      where: { id: normalized.paymentId },
    });

    if (!existingPayment) {
      logAudit(
        createAuditEntry(
          normalized.paymentId,
          provider,
          normalized.status,
          "NOT_FOUND",
          undefined,
          undefined,
          "Payment not found in database",
        ),
      );
      return apiError("Pagamento não encontrado", 404);
    }

    if (
      existingPayment.status === PaymentStatus.CONFIRMED &&
      normalized.status === PaymentStatus.CONFIRMED
    ) {
      logAudit(
        createAuditEntry(
          normalized.paymentId,
          provider,
          normalized.status,
          "DUPLICATE",
          existingPayment.userId,
          existingPayment.status,
          normalized.requestId
            ? `Duplicate confirmed callback ignored (${normalized.requestId})`
            : "Duplicate confirmed callback ignored",
        ),
      );
      return apiSuccess({ payment: existingPayment, duplicate: true });
    }

    logAudit(
      createAuditEntry(
        normalized.paymentId,
        provider,
        normalized.status,
        "VERIFIED",
        existingPayment.userId,
        existingPayment.status,
        normalized.requestId ? `Verified callback ${normalized.requestId}` : "Verified callback",
      ),
    );

    const paymentService = new PaymentService(db);
    const payload =
      existingPayment.payloadJson && typeof existingPayment.payloadJson === "object"
        ? (existingPayment.payloadJson as Record<string, unknown>)
        : {};

    if (normalized.status === PaymentStatus.CONFIRMED) {
      const purchaseType = payload.purchaseType as string | undefined;

      if (purchaseType === "extra_work") {
        const quantity = Number(payload.quantity || 1);
        const payment = await paymentService.confirmExtraWorkPayment(
          normalized.paymentId,
          normalized.providerReference,
          quantity,
        );

        logAudit(
          createAuditEntry(
            normalized.paymentId,
            provider,
            normalized.status,
            "CONFIRMED",
            existingPayment.userId,
            existingPayment.status,
            `Extra work payment confirmed: ${quantity} work(s)`,
          ),
        );

        return apiSuccess({ payment });
      }

      if (purchaseType === "subscription") {
        const packageTypeRaw = String(payload.package || "STARTER");
        const packageType = PackageType[packageTypeRaw as keyof typeof PackageType];
        if (!packageType || packageType === PackageType.FREE) {
          return apiError("Pacote inválido", 400);
        }

        const payment = await paymentService.confirmPackagePayment(
          normalized.paymentId,
          normalized.providerReference,
          packageType,
        );

        logAudit(
          createAuditEntry(
            normalized.paymentId,
            provider,
            normalized.status,
            "CONFIRMED",
            existingPayment.userId,
            existingPayment.status,
            `Package payment confirmed: ${packageType}`,
          ),
        );

        return apiSuccess({ payment });
      }

      const payment = await paymentService.confirmPayment(
        normalized.paymentId,
        normalized.providerReference,
        normalized.providerPayload,
      );

      logAudit(
        createAuditEntry(
          normalized.paymentId,
          provider,
          normalized.status,
          "CONFIRMED",
          existingPayment.userId,
          existingPayment.status,
          "Legacy payment confirmed",
        ),
      );

      return apiSuccess({ payment });
    }

    const payment = await db.paymentTransaction.update({
      where: { id: normalized.paymentId },
      data: {
        status: normalized.status,
        payloadJson: {
          ...payload,
          callbackRequestId: normalized.requestId,
          lastCallbackStatus: normalized.status,
          lastCallbackPayload: toJsonValue(normalized.providerPayload),
        },
      },
    });

    logAudit(
      createAuditEntry(
        normalized.paymentId,
        provider,
        normalized.status,
        "UPDATED",
        existingPayment.userId,
        existingPayment.status,
        `Status changed to ${normalized.status}`,
      ),
    );

    return apiSuccess({ payment });
  } catch (error) {
    return handleApiError(error);
  }
}
