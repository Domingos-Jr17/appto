import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { PaymentProvider } from "@prisma/client";

import {
  normalizePaymentCallback,
  resolvePaymentGateway,
  verifyWebhookSignature,
} from "@/lib/payment-gateway";

describe("payment gateway helpers", () => {
  test("uses simulated gateway when explicitly selected", () => {
    expect(resolvePaymentGateway(PaymentProvider.SIMULATED, "PAYSUITE")).toEqual({
      gateway: "SIMULATED",
      method: PaymentProvider.SIMULATED,
    });
  });

  test("routes mobile money methods through PaySuite in production mode", () => {
    expect(resolvePaymentGateway(PaymentProvider.MPESA, "PAYSUITE")).toEqual({
      gateway: "PAYSUITE",
      method: PaymentProvider.MPESA,
    });
    expect(resolvePaymentGateway(PaymentProvider.EMOLA, "PAYSUITE")).toEqual({
      gateway: "PAYSUITE",
      method: PaymentProvider.EMOLA,
    });
  });

  test("validates webhook signatures with HMAC SHA256", () => {
    const payload = JSON.stringify({ hello: "world" });
    const secret = "webhook-secret";
    const signature = createHmac("sha256", secret).update(payload).digest("hex");

    expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
    expect(verifyWebhookSignature(payload, signature, "wrong-secret")).toBe(false);
  });

  test("normalizes PaySuite payment.success payloads", () => {
    const normalized = normalizePaymentCallback(
      {
        event: "payment.success",
        data: {
          id: "ps_123",
          reference: "payment_abc",
          transaction: {
            id: "tr_789",
            method: "mpesa",
          },
        },
        request_id: "req_1",
      },
      {
        signature: "sig",
        rawBody: "{}",
      }
    );

    expect(normalized).toMatchObject({
      paymentId: "payment_abc",
      providerReference: "tr_789",
      status: "CONFIRMED",
      requestId: "req_1",
    });
  });

  test("normalizes PaySuite payment.failed payloads", () => {
    const normalized = normalizePaymentCallback(
      {
        event: "payment.failed",
        data: {
          id: "ps_123",
          reference: "payment_abc",
        },
        request_id: "req_2",
      },
      {
        signature: "sig",
        rawBody: "{}",
      }
    );

    expect(normalized).toMatchObject({
      paymentId: "payment_abc",
      providerReference: "ps_123",
      status: "FAILED",
      requestId: "req_2",
    });
  });
});
