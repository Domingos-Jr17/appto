import { describe, expect, mock, spyOn, test } from "bun:test";
import { PaymentProvider, PaymentStatus } from "@prisma/client";

mock.module("server-only", () => ({}));

async function loadPaymentService() {
  const paymentsModule = await import("@/lib/payments");
  return paymentsModule.PaymentService;
}

describe("PaymentService", () => {
  test("keeps simulated package checkout pending until confirmation side effects run", async () => {
    const PaymentService = await loadPaymentService();
    const paymentRecord = {
      id: "pay_1",
      userId: "user_1",
      provider: PaymentProvider.SIMULATED,
      providerReference: "temp-ref",
      status: PaymentStatus.PENDING,
      creditsAmount: 4,
      moneyAmount: 100,
      currency: "MZN",
      payloadJson: null,
    };

    const db = {
      paymentTransaction: {
        create: mock(async () => paymentRecord),
        update: mock(async (_input) => paymentRecord),
        findUniqueOrThrow: mock(async () => paymentRecord),
      },
    };

    const service = new PaymentService(db as never);
    const confirmSpy = spyOn(service, "confirmPackagePayment").mockResolvedValue(paymentRecord as never);

    await service.createPackageCheckout("user_1", PaymentProvider.SIMULATED, "STARTER");

    const firstUpdateArgs = (db.paymentTransaction.update as ReturnType<typeof mock>).mock.calls[0]?.[0];
    expect(firstUpdateArgs?.data?.status).toBe(PaymentStatus.PENDING);
    expect(confirmSpy).toHaveBeenCalled();
  });

  test("does not mint duplicate extra works when payment is already confirmed", async () => {
    const PaymentService = await loadPaymentService();
    const confirmedPayment = {
      id: "pay_1",
      userId: "user_1",
      provider: PaymentProvider.SIMULATED,
      providerReference: "sim-ref",
      status: PaymentStatus.CONFIRMED,
      creditsAmount: 2,
      moneyAmount: 100,
      currency: "MZN",
      payloadJson: null,
      confirmedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const db = {
      paymentTransaction: {
        findUnique: mock(async () => confirmedPayment),
        update: mock(async () => confirmedPayment),
      },
      workPurchase: {
        create: mock(async () => null),
      },
    };

    const service = new PaymentService(db as never);
    const result = await service.confirmExtraWorkPayment("pay_1", "ref_1", 2);

    expect(result.id).toBe(confirmedPayment.id);
    expect(db.workPurchase.create).not.toHaveBeenCalled();
  });
});
