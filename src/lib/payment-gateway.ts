import { timingSafeEqual, createHmac } from "node:crypto";
import { PaymentProvider, PaymentStatus } from "@prisma/client";

export type PaymentGateway = "SIMULATED" | "PAYSUITE";

interface CallbackContext {
  signature?: string | null;
  rawBody: string;
}

interface InternalPaymentCallbackPayload {
  paymentId: string;
  providerReference: string;
  status: "CONFIRMED" | "FAILED" | "CANCELLED";
  providerPayload?: unknown;
  requestId?: string;
}

interface PaySuiteWebhookPayload {
  event: "payment.success" | "payment.failed";
  data: {
    id: string;
    reference: string;
    transaction?: {
      id?: string;
      method?: string;
      paid_at?: string;
    };
    [key: string]: unknown;
  };
  created_at?: number;
  request_id?: string;
}

export interface NormalizedPaymentCallback {
  paymentId: string;
  providerReference: string;
  status: PaymentStatus;
  providerPayload?: unknown;
  signature?: string | null;
  requestId?: string;
  rawBody: string;
}

export function resolvePaymentGateway(
  method: PaymentProvider,
  configuredGateway: PaymentGateway,
): { gateway: PaymentGateway; method: PaymentProvider } {
  if (method === PaymentProvider.SIMULATED) {
    return { gateway: "SIMULATED", method };
  }

  if (configuredGateway === "PAYSUITE") {
    return { gateway: "PAYSUITE", method };
  }

  return { gateway: "SIMULATED", method };
}

export function verifyWebhookSignature(
  payload: string,
  signature: string | null | undefined,
  secret: string | undefined,
): boolean {
  if (!signature || !secret) {
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

    return timingSafeEqual(providedSig, expectedSig);
  } catch {
    return false;
  }
}

export function normalizePaymentCallback(
  payload: unknown,
  context: CallbackContext,
): NormalizedPaymentCallback {
  if (isPaySuiteWebhookPayload(payload)) {
    return {
      paymentId: payload.data.reference,
      providerReference: payload.data.transaction?.id || payload.data.id,
      status:
        payload.event === "payment.success"
          ? PaymentStatus.CONFIRMED
          : PaymentStatus.FAILED,
      providerPayload: payload,
      signature: context.signature,
      requestId: payload.request_id,
      rawBody: context.rawBody,
    };
  }

  if (isInternalPaymentCallbackPayload(payload)) {
    return {
      paymentId: payload.paymentId,
      providerReference: payload.providerReference,
      status: payload.status,
      providerPayload: payload.providerPayload,
      signature: context.signature,
      requestId: payload.requestId,
      rawBody: context.rawBody,
    };
  }

  throw new Error("Payload de callback inválido");
}

function isPaySuiteWebhookPayload(payload: unknown): payload is PaySuiteWebhookPayload {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as Record<string, unknown>;
  if (candidate.event !== "payment.success" && candidate.event !== "payment.failed") {
    return false;
  }

  const data = candidate.data;
  if (!data || typeof data !== "object") return false;

  return typeof (data as Record<string, unknown>).reference === "string";
}

function isInternalPaymentCallbackPayload(payload: unknown): payload is InternalPaymentCallbackPayload {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as Record<string, unknown>;

  return (
    typeof candidate.paymentId === "string" &&
    typeof candidate.providerReference === "string" &&
    (candidate.status === "CONFIRMED" ||
      candidate.status === "FAILED" ||
      candidate.status === "CANCELLED")
  );
}
