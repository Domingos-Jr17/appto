import crypto from "node:crypto";
import { PaymentProvider as PaymentProviderEnum, PaymentStatus, PackageType, type Prisma, type PrismaClient } from "@prisma/client";
import { BILLING_PLANS, EXTRA_WORKS } from "@/lib/billing";

const EXTRA_WORK_PRICE = EXTRA_WORKS.price;
import { SubscriptionService } from "@/lib/subscription";
import { env } from "@/lib/env";
import { resolvePaymentGateway } from "@/lib/payment-gateway";

type DbClient = PrismaClient | Prisma.TransactionClient;

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

async function withOptionalTransaction<T>(
  dbClient: DbClient,
  fn: (tx: DbClient) => Promise<T>,
): Promise<T> {
  if ("$transaction" in dbClient && typeof dbClient.$transaction === "function") {
    return dbClient.$transaction(async (tx) => fn(tx));
  }

  return fn(dbClient);
}

export interface CheckoutResult {
  providerReference: string;
  status: PaymentStatus;
  instructions: string;
  checkoutUrl?: string;
}

export type PackageKey = "STARTER" | "PRO";
export type PurchaseType = "subscription" | "extra_work";

export interface PaymentProviderContract {
  createPackageCheckout(input: { paymentId: string; packageType: PackageKey }): Promise<CheckoutResult>;
  createExtraWorkCheckout(input: { paymentId: string; quantity: number }): Promise<CheckoutResult>;
  parseCallback(payload: unknown): Promise<{ providerReference: string; status: PaymentStatus; providerPayload?: unknown }>;
}

class SimulatedPaymentProvider implements PaymentProviderContract {
  provider: PaymentProviderEnum;

  constructor(provider: PaymentProviderEnum = PaymentProviderEnum.SIMULATED) {
    this.provider = provider;
  }

  async createPackageCheckout(input: { paymentId: string; packageType: PackageKey }): Promise<CheckoutResult> {
    const packageName = input.packageType;
    return {
      providerReference: `sim-package-${input.paymentId}`,
      status: PaymentStatus.CONFIRMED,
      instructions: `Pagamento sandbox confirmado para o pacote ${packageName}.`,
    };
  }

  async createExtraWorkCheckout(input: { paymentId: string; quantity: number }): Promise<CheckoutResult> {
    return {
      providerReference: `sim-extra-${input.paymentId}`,
      status: PaymentStatus.CONFIRMED,
      instructions: `Pagamento sandbox confirmado para ${input.quantity} trabalho(s) extra(s).`,
    };
  }

  async parseCallback(payload: unknown) {
    const data = payload as { providerReference: string; status?: PaymentStatus; providerPayload?: unknown };
    return {
      providerReference: data.providerReference,
      status: data.status ?? PaymentStatus.CONFIRMED,
      providerPayload: data.providerPayload,
    };
  }
}

class PaySuitePaymentProvider implements PaymentProviderContract {
  provider: "MPESA" | "EMOLA";

  constructor(provider: "MPESA" | "EMOLA") {
    this.provider = provider;
  }

  async createPackageCheckout(input: { paymentId: string; packageType: PackageKey }): Promise<CheckoutResult> {
    const packagePricing = BILLING_PLANS[input.packageType];
    return createPaySuitePayment({
      amount: packagePricing.price,
      paymentId: input.paymentId,
      method: this.provider,
      description: `Upgrade de pacote ${input.packageType}`,
    });
  }

  async createExtraWorkCheckout(input: { paymentId: string; quantity: number }): Promise<CheckoutResult> {
    return createPaySuitePayment({
      amount: input.quantity * EXTRA_WORK_PRICE,
      paymentId: input.paymentId,
      method: this.provider,
      description: `Compra de ${input.quantity} trabalho(s) extra(s)`,
    });
  }

  async parseCallback(payload: unknown) {
    const data = payload as { data?: { id?: string }; event?: string };
    return {
      providerReference: data?.data?.id || "",
      status:
        data?.event === "payment.success"
          ? PaymentStatus.CONFIRMED
          : PaymentStatus.FAILED,
      providerPayload: payload,
    };
  }
}

async function createPaySuitePayment(input: {
  amount: number;
  paymentId: string;
  method: "MPESA" | "EMOLA";
  description: string;
}): Promise<CheckoutResult> {
  if (!env.PAYSUITE_API_TOKEN) {
    throw new Error("PAYSUITE_API_TOKEN não configurado.");
  }

  const endpoint = `${env.PAYSUITE_API_BASE_URL.replace(/\/+$/, "")}/api/v1/payments`;
  const callbackBaseUrl = env.PAYSUITE_CALLBACK_BASE_URL || env.APP_URL;
  const callbackUrl = `${callbackBaseUrl.replace(/\/$/, "")}/api/payments/callback/${input.method.toLowerCase()}`;
  const returnUrl = `${env.APP_URL.replace(/\/$/, "")}/app/subscription?payment=pending`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.PAYSUITE_API_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      amount: input.amount.toFixed(2),
      method: input.method === PaymentProviderEnum.MPESA ? "mpesa" : "emola",
      reference: input.paymentId,
      description: input.description,
      return_url: returnUrl,
      callback_url: callbackUrl,
    }),
  });

  const responseBody = await response.json().catch(() => null);

  if (!response.ok || !responseBody?.data?.id) {
    throw new Error(responseBody?.message || "Falha ao criar checkout PaySuite.");
  }

  return {
    providerReference: responseBody.data.id,
    status: PaymentStatus.PENDING,
    instructions: `Checkout PaySuite criado com sucesso para ${input.method}.`,
    checkoutUrl: responseBody.data.checkout_url,
  };
}

export function getPaymentProvider(provider: PaymentProviderEnum): PaymentProviderContract {
  const runtime = resolvePaymentGateway(provider, env.PAYMENT_GATEWAY);

  if (runtime.gateway === "PAYSUITE") {
    if (
      runtime.method !== PaymentProviderEnum.MPESA &&
      runtime.method !== PaymentProviderEnum.EMOLA
    ) {
      throw new Error(`Método ${runtime.method} não suportado pela PaySuite.`);
    }

    return new PaySuitePaymentProvider(runtime.method);
  }

  return new SimulatedPaymentProvider(provider);
}

export class PaymentService {
  constructor(private readonly db: DbClient) {}

  async createPackageCheckout(userId: string, provider: PaymentProviderEnum, packageType: PackageKey) {
    const packagePricing = BILLING_PLANS[packageType];
    const payment = await this.db.paymentTransaction.create({
      data: {
        userId,
        provider,
        providerReference: crypto.randomUUID(),
        status: PaymentStatus.PENDING,
        creditsAmount: packagePricing.worksPerMonth,
        moneyAmount: packagePricing.price,
        currency: "MZN",
        payloadJson: { purchaseType: "subscription", package: packageType },
      },
    });

    const checkout = await getPaymentProvider(provider).createPackageCheckout({
      paymentId: payment.id,
      packageType: packageType,
    });

    await this.db.paymentTransaction.update({
      where: { id: payment.id },
      data: {
        providerReference: checkout.providerReference,
        status:
          checkout.status === PaymentStatus.CONFIRMED
            ? PaymentStatus.PENDING
            : checkout.status,
        payloadJson: {
          purchaseType: "subscription",
          package: packageType,
          gateway: env.PAYMENT_GATEWAY,
          checkoutInstructions: checkout.instructions,
          checkoutUrl: checkout.checkoutUrl,
        },
      },
    });

    if (checkout.status === PaymentStatus.CONFIRMED) {
      await this.confirmPackagePayment(payment.id, checkout.providerReference, packageType);
    }

    return this.db.paymentTransaction.findUniqueOrThrow({
      where: { id: payment.id },
    });
  }

  async createExtraWorkCheckout(userId: string, provider: PaymentProviderEnum, quantity: number) {
    const totalPrice = EXTRA_WORK_PRICE * quantity;
    const payment = await this.db.paymentTransaction.create({
      data: {
        userId,
        provider,
        providerReference: crypto.randomUUID(),
        status: PaymentStatus.PENDING,
        creditsAmount: quantity,
        moneyAmount: totalPrice,
        currency: "MZN",
        payloadJson: { purchaseType: "extra_work", quantity },
      },
    });

    const checkout = await getPaymentProvider(provider).createExtraWorkCheckout({
      paymentId: payment.id,
      quantity,
    });

    await this.db.paymentTransaction.update({
      where: { id: payment.id },
      data: {
        providerReference: checkout.providerReference,
        status:
          checkout.status === PaymentStatus.CONFIRMED
            ? PaymentStatus.PENDING
            : checkout.status,
        payloadJson: {
          purchaseType: "extra_work",
          quantity,
          gateway: env.PAYMENT_GATEWAY,
          checkoutInstructions: checkout.instructions,
          checkoutUrl: checkout.checkoutUrl,
        },
      },
    });

    if (checkout.status === PaymentStatus.CONFIRMED) {
      await this.confirmExtraWorkPayment(payment.id, checkout.providerReference, quantity);
    }

    return this.db.paymentTransaction.findUniqueOrThrow({
      where: { id: payment.id },
    });
  }

  async confirmPackagePayment(paymentId: string, providerReference: string, packageType: PackageType) {
    return withOptionalTransaction(this.db, async (tx) => {
      const payment = await tx.paymentTransaction.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new Error("Pagamento não encontrado.");
      }

      if (payment.status === PaymentStatus.CONFIRMED) {
        return payment;
      }

      const subscriptionService = new SubscriptionService(tx as PrismaClient);
      await subscriptionService.activatePackage(payment.userId, packageType);

      return tx.paymentTransaction.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.CONFIRMED,
          confirmedAt: new Date(),
          payloadJson: {
            ...((payment.payloadJson as Record<string, unknown> | null) ?? {}),
            package: packageType,
            providerReference,
          },
        },
      });
    });
  }

  async confirmExtraWorkPayment(paymentId: string, providerReference: string, quantity: number) {
    return withOptionalTransaction(this.db, async (tx) => {
      const payment = await tx.paymentTransaction.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new Error("Pagamento não encontrado.");
      }

      if (payment.status === PaymentStatus.CONFIRMED) {
        return payment;
      }

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + EXTRA_WORKS.validityMonths);

      await tx.workPurchase.create({
        data: {
          userId: payment.userId,
          quantity,
          pricePaid: payment.moneyAmount,
          used: 0,
          expiresAt,
        },
      });

      return tx.paymentTransaction.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.CONFIRMED,
          confirmedAt: new Date(),
          payloadJson: {
            ...((payment.payloadJson as Record<string, unknown> | null) ?? {}),
            quantity,
            providerReference,
          },
        },
      });
    });
  }

  async confirmPayment(paymentId: string, providerReference: string, payload: unknown) {
    const payment = await this.db.paymentTransaction.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error("Pagamento não encontrado.");
    }

    if (payment.status === PaymentStatus.CONFIRMED) {
      return payment;
    }

    const existingPayload = (payment.payloadJson as Record<string, unknown> | null) ?? {};
    const newPayload = typeof payload === "object" && payload !== null 
      ? (payload as Record<string, unknown>) 
      : {};

    return this.db.paymentTransaction.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.CONFIRMED,
        confirmedAt: new Date(),
        providerReference,
        payloadJson: { ...existingPayload, ...newPayload } as Prisma.InputJsonValue,
      },
    });
  }
}