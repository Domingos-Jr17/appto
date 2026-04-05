import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { PackageType, PaymentStatus } from "@prisma/client";

import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { withDistributedLock } from "@/lib/distributed-lock";
import { env } from "@/lib/env";
import { sendPurchaseReceiptEmail, sendExtraWorksReceiptEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { normalizePaymentCallback, verifyWebhookSignature } from "@/lib/payment-gateway";
import { PaymentService } from "@/lib/payments";
import { trackProductEvent } from "@/lib/product-events";
import { enforceRateLimit } from "@/lib/rate-limit";
import { PACKAGE_PRICES } from "@/lib/subscription";
import { EXTRA_WORKS } from "@/lib/billing";

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
  logger.info("[payment-callback] audit", { ...entry });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider } = await params;
    const rawBody = await request.text();
    const signatureHeader = request.headers.get("x-webhook-signature");

    let parsedBody: Record<string, unknown>;
    try {
      parsedBody = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return apiError("Payload inválido", 400);
    }

     const normalized = normalizePaymentCallback(parsedBody, {
       signature: (signatureHeader ?? parsedBody?.signature) as string | null | undefined,
       rawBody,
     });

    await enforceRateLimit(`payment-callback:${provider}:${normalized.paymentId}`, 30, 60 * 1000);

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

    return withDistributedLock(
      `payment-callback:${normalized.paymentId}`,
      20_000,
      async () => {
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
          existingPayment.provider !== "SIMULATED" &&
          existingPayment.provider.toLowerCase() !== provider.toLowerCase()
        ) {
          logAudit(
            createAuditEntry(
              normalized.paymentId,
              provider,
              normalized.status,
              "FAILED",
              existingPayment.userId,
              existingPayment.status,
              `Provider mismatch: expected ${existingPayment.provider}, received ${provider}`,
            ),
          );
          return apiError("Provider inválido para este pagamento", 400);
        }

        if (existingPayment.status === PaymentStatus.CONFIRMED) {
          logAudit(
            createAuditEntry(
              normalized.paymentId,
              provider,
              normalized.status,
              "DUPLICATE",
              existingPayment.userId,
              existingPayment.status,
              normalized.requestId
                ? `Duplicate or stale callback ignored (${normalized.requestId})`
                : "Duplicate or stale callback ignored",
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
        const processedRequestIds = Array.isArray(payload.processedRequestIds)
          ? payload.processedRequestIds.filter((value): value is string => typeof value === "string")
          : [];

        if (normalized.requestId && processedRequestIds.includes(normalized.requestId)) {
          logAudit(
            createAuditEntry(
              normalized.paymentId,
              provider,
              normalized.status,
              "DUPLICATE",
              existingPayment.userId,
              existingPayment.status,
              "Duplicate callback request ignored",
            ),
          );
          return apiSuccess({ payment: existingPayment, duplicate: true });
        }

        if (normalized.status === PaymentStatus.CONFIRMED) {
          const purchaseType = payload.purchaseType as string | undefined;

          if (purchaseType === "extra_work") {
            const quantity = Number(payload.quantity || 1);
            const payment = await paymentService.confirmExtraWorkPayment(
              normalized.paymentId,
              normalized.providerReference,
              quantity,
            );

            // Send extra works receipt email (non-blocking)
            const user = await db.user.findUnique({
              where: { id: existingPayment.userId },
              select: { email: true, name: true },
            });
            if (user) {
              sendExtraWorksReceiptEmail(user.email, user.name, {
                quantity,
                unitPrice: EXTRA_WORKS.price,
                total: Number(existingPayment.moneyAmount),
                currency: "MZN",
                paymentMethod: existingPayment.provider,
                transactionId: normalized.paymentId,
                date: new Date().toLocaleString("pt-MZ"),
                validityMonths: EXTRA_WORKS.validityMonths,
              }).catch((err) => {
                logger.error("Failed to send extra works receipt email", { error: String(err), email: user.email });
              });
            }

            await trackProductEvent({
              name: "payment_confirmed",
              category: "billing",
              userId: existingPayment.userId,
              paymentId: normalized.paymentId,
              metadata: { purchaseType: "extra_work", quantity, provider },
            }).catch(() => null);

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

            // Send purchase receipt email (non-blocking)
            const user = await db.user.findUnique({
              where: { id: existingPayment.userId },
              select: { email: true, name: true },
            });
            if (user) {
              const planDetails = PACKAGE_PRICES[packageType];
              sendPurchaseReceiptEmail(user.email, user.name, {
                packageName: planDetails.name,
                amount: Number(existingPayment.moneyAmount),
                currency: "MZN",
                worksIncluded: planDetails.worksPerMonth,
                paymentMethod: existingPayment.provider,
                transactionId: normalized.paymentId,
                date: new Date().toLocaleString("pt-MZ"),
              }).catch((err) => {
                logger.error("Failed to send purchase receipt email", { error: String(err), email: user.email });
              });
            }

            await trackProductEvent({
              name: "payment_confirmed",
              category: "billing",
              userId: existingPayment.userId,
              paymentId: normalized.paymentId,
              metadata: { purchaseType: "subscription", packageType, provider },
            }).catch(() => null);

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

          await trackProductEvent({
            name: "payment_confirmed",
            category: "billing",
            userId: existingPayment.userId,
            paymentId: normalized.paymentId,
            metadata: { purchaseType: payload.purchaseType || "legacy", provider },
          }).catch(() => null);

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
              processedRequestIds: normalized.requestId
                ? Array.from(new Set([...processedRequestIds, normalized.requestId]))
                : processedRequestIds,
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
      },
      "Já existe um callback deste pagamento em processamento.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
