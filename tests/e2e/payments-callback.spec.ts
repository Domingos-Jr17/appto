import { test, expect } from "@playwright/test";

const API_BASE = process.env.E2E_API_URL || "http://localhost:3000";

test.describe("Payment Callback API", () => {

  test("retorna 401 para assinatura inválida", async ({ request }) => {
    const payload = {
      paymentId: "pay_test_123",
      providerReference: "mpesa_ref_456",
      status: "CONFIRMED",
      providerPayload: {},
      signature: "invalid-signature",
    };

    const response = await request.post(`${API_BASE}/api/payments/callback/mpesa`, {
      data: payload,
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status()).toBe(401);
    const json = await response.json();
    expect(json.error).toBe("Assinatura inválida");
  });

  test("retorna 401 quando signature está vazia", async ({ request }) => {
    const payload = {
      paymentId: "pay_test_123",
      providerReference: "mpesa_ref_456",
      status: "CONFIRMED",
      providerPayload: {},
      signature: "",
    };

    const response = await request.post(`${API_BASE}/api/payments/callback/mpesa`, {
      data: payload,
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status()).toBe(401);
  });

  test("retorna 422 para payload inválido (schema validation)", async ({ request }) => {
    const payload = {
      paymentId: "",
      providerReference: "ref",
      status: "CONFIRMED",
      providerPayload: {},
      signature: "abc123",
    };

    const response = await request.post(`${API_BASE}/api/payments/callback/mpesa`, {
      data: payload,
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status()).toBe(422);
  });

  test("retorna 422 quando status é inválido", async ({ request }) => {
    const payload = {
      paymentId: "pay_test_123",
      providerReference: "mpesa_ref_456",
      status: "INVALID_STATUS",
      providerPayload: {},
      signature: "abc123",
    };

    const response = await request.post(`${API_BASE}/api/payments/callback/mpesa`, {
      data: payload,
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status()).toBe(422);
  });
});