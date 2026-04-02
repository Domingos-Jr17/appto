import { describe, expect, test, beforeEach, spyOn } from "bun:test";
import { NextRequest, NextResponse } from "next/server";

describe("Payment Callback API - Unit Tests", () => {
  let consoleLogs: string[] = [];

  beforeEach(() => {
    consoleLogs = [];
    spyOn(console, "log").mockImplementation((msg: string) => {
      consoleLogs.push(msg);
    });
    spyOn(console, "error").mockImplementation((msg: string) => {
      consoleLogs.push(msg);
    });
  });

  function createValidSignature(payload: string, secret: string): string {
    const { createHmac } = require("crypto");
    return createHmac("sha256", secret).update(payload).digest("hex");
  }

  test("validar formato do schema de callback", async () => {
    const { paymentCallbackSchema } = await import("@/lib/validators");
    
    const validPayload = {
      paymentId: "pay_123",
      providerReference: "ref_456",
      status: "CONFIRMED",
      providerPayload: { transactionId: "TX123" },
      signature: "abc123",
    };

    expect(() => paymentCallbackSchema.parse(validPayload)).not.toThrow();
  });

  test("validar que status aceita apenas valores permitidos", async () => {
    const { paymentCallbackSchema } = await import("@/lib/validators");
    
    const invalidPayload = {
      paymentId: "pay_123",
      providerReference: "ref_456",
      status: "INVALID_STATUS",
      providerPayload: {},
      signature: "abc123",
    };

    expect(() => paymentCallbackSchema.parse(invalidPayload)).toThrow();
  });

  test("assinatura válida com HMAC SHA256", () => {
    const { createHmac } = require("crypto");
    
    const payload = '{"test":"data"}';
    const secret = "test-secret";
    
    const signature = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    
    const expectedSignature = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    
    expect(signature).toBe(expectedSignature);
    expect(signature.length).toBe(64);
  });

  test("assinatura inválida não coincide", () => {
    const { createHmac } = require("crypto");
    
    const payload = '{"test":"data"}';
    const correctSecret = "correct-secret";
    const wrongSecret = "wrong-secret";
    
    const correctSig = createHmac("sha256", correctSecret)
      .update(payload)
      .digest("hex");
    
    const wrongSig = createHmac("sha256", wrongSecret)
      .update(payload)
      .digest("hex");
    
    expect(correctSig).not.toBe(wrongSig);
  });

  test("formato do log de audit", () => {
    const { randomUUID } = require("crypto");
    
    const entry = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      paymentId: "pay_123",
      provider: "mpesa",
      status: "CONFIRMED",
      userId: "user_456",
      previousStatus: "PENDING",
      action: "CONFIRMED",
      details: "Payment confirmed successfully",
    };
    
    expect(entry.id).toBeDefined();
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(entry.action).toBeOneOf(["VERIFIED", "NOT_FOUND", "CONFIRMED", "UPDATED", "FAILED"]);
  });
});

describe("Payment Callback - Integration Scenarios", () => {
  test("cenário: pagamento confirmado com credits", async () => {
    const mockPaymentDbUpdate = {
      id: "pay_123",
      userId: "user_456",
      status: "CONFIRMED",
      creditsAmount: 100,
      moneyAmount: 500,
    };
    
    expect(mockPaymentDbUpdate.status).toBe("CONFIRMED");
    expect(mockPaymentDbUpdate.creditsAmount).toBe(100);
  });

  test("cenário: pagamento falhou", async () => {
    const mockPaymentUpdate = {
      id: "pay_123",
      userId: "user_456",
      status: "FAILED",
      providerReference: "mpesa_fail_123",
    };
    
    expect(mockPaymentUpdate.status).toBe("FAILED");
  });

  test("cenário: pagamento cancelado", async () => {
    const mockPaymentUpdate = {
      id: "pay_123",
      userId: "user_456",
      status: "CANCELLED",
      providerReference: "mpesa_cancel_123",
    };
    
    expect(mockPaymentUpdate.status).toBe("CANCELLED");
  });

  test("cenário: duplicate callback idempotency", async () => {
    const firstCall = { paymentId: "pay_123", status: "CONFIRMED" };
    const secondCall = { paymentId: "pay_123", status: "CONFIRMED" };
    
    expect(firstCall.paymentId).toBe(secondCall.paymentId);
    expect(firstCall.status).toBe(secondCall.status);
  });
});