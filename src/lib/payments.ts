import crypto from "node:crypto";
import { PaymentProvider as PaymentProviderEnum, PaymentStatus, PackageType, type Prisma, type PrismaClient } from "@prisma/client";
import { CREDIT_PACKAGES, PACKAGE_PRICING, EXTRA_WORK_PRICE, type CreditPackageKey } from "@/lib/credits";
import { CreditLedgerService } from "@/lib/credit-ledger";
import { SubscriptionService } from "@/lib/subscription";

type DbClient = PrismaClient | Prisma.TransactionClient;

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
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
  provider: PaymentProviderEnum;
  createCheckout(input: { paymentId: string; packageKey: CreditPackageKey }): Promise<CheckoutResult>;
  createPackageCheckout(input: { paymentId: string; packageType: PackageKey }): Promise<CheckoutResult>;
  createExtraWorkCheckout(input: { paymentId: string; quantity: number }): Promise<CheckoutResult>;
  parseCallback(payload: unknown): Promise<{ providerReference: string; status: PaymentStatus; providerPayload?: unknown }>;
}

class SimulatedPaymentProvider implements PaymentProviderContract {
  provider = PaymentProviderEnum.SIMULATED;

  async createCheckout(input: { paymentId: string; packageKey: CreditPackageKey }): Promise<CheckoutResult> {
    return {
      providerReference: `sim-${input.paymentId}`,
      status: PaymentStatus.CONFIRMED,
      instructions: `Pagamento sandbox confirmado para o pacote ${input.packageKey}.`,
    };
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

export function getPaymentProvider(provider: PaymentProviderEnum): PaymentProviderContract {
  switch (provider) {
    case PaymentProviderEnum.SIMULATED:
      return new SimulatedPaymentProvider();
    case PaymentProviderEnum.MPESA:
    case PaymentProviderEnum.EMOLA:
      return {
        provider,
        async createCheckout() {
          throw new Error(`Provider ${provider} ainda não está configurado.`);
        },
        async createPackageCheckout() {
          throw new Error(`Provider ${provider} ainda não está configurado.`);
        },
        async createExtraWorkCheckout() {
          throw new Error(`Provider ${provider} ainda não está configurado.`);
        },
        async parseCallback() {
          throw new Error(`Provider ${provider} ainda não está configurado.`);
        },
      };
    default:
      return new SimulatedPaymentProvider();
  }
}

export class PaymentService {
  constructor(private readonly db: DbClient) {}

  async createCheckout(userId: string, provider: PaymentProviderEnum, packageKey: CreditPackageKey) {
    const selectedPackage = CREDIT_PACKAGES[packageKey];
    const payment = await this.db.paymentTransaction.create({
      data: {
        userId,
        provider,
        providerReference: crypto.randomUUID(),
        status: PaymentStatus.PENDING,
        creditsAmount: selectedPackage.credits,
        moneyAmount: selectedPackage.price,
        currency: selectedPackage.currency,
        payloadJson: { packageKey },
      },
    });

    const checkout = await getPaymentProvider(provider).createCheckout({
      paymentId: payment.id,
      packageKey,
    });

    await this.db.paymentTransaction.update({
      where: { id: payment.id },
      data: {
        providerReference: checkout.providerReference,
        status: checkout.status,
        payloadJson: {
          packageKey,
          checkoutInstructions: checkout.instructions,
        },
      },
    });

    if (checkout.status === PaymentStatus.CONFIRMED) {
      await this.confirmPayment(payment.id, checkout.providerReference, {
        checkoutInstructions: checkout.instructions,
      });
    }

    return this.db.paymentTransaction.findUniqueOrThrow({
      where: { id: payment.id },
    });
  }

  async createPackageCheckout(userId: string, provider: PaymentProviderEnum, packageType: PackageKey) {
    const packagePricing = PACKAGE_PRICING[packageType];
    const payment = await this.db.paymentTransaction.create({
      data: {
        userId,
        provider,
        providerReference: crypto.randomUUID(),
        status: PaymentStatus.PENDING,
        creditsAmount: packagePricing.works,
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
        status: checkout.status,
        payloadJson: {
          purchaseType: "subscription",
          package: packageType,
          checkoutInstructions: checkout.instructions,
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
        status: checkout.status,
        payloadJson: {
          purchaseType: "extra_work",
          quantity,
          checkoutInstructions: checkout.instructions,
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
    const payment = await this.db.paymentTransaction.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error("Pagamento não encontrado.");
    }

    if (payment.status === PaymentStatus.CONFIRMED) {
      return payment;
    }

    const subscriptionService = new SubscriptionService();
    await subscriptionService.activatePackage(payment.userId, packageType);

    return this.db.paymentTransaction.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.CONFIRMED,
        confirmedAt: new Date(),
        payloadJson: { package: packageType },
      },
    });
  }

  async confirmExtraWorkPayment(paymentId: string, providerReference: string, quantity: number) {
    const payment = await this.db.paymentTransaction.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error("Pagamento não encontrado.");
    }

    const existingPurchase = await this.db.workPurchase.findFirst({
      where: { userId: payment.userId, pricePaid: payment.moneyAmount },
      orderBy: { createdAt: "desc" },
    });

    if (!existingPurchase || existingPurchase.quantity !== quantity) {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 3);

      await this.db.workPurchase.create({
        data: {
          userId: payment.userId,
          quantity,
          pricePaid: payment.moneyAmount,
          used: 0,
          expiresAt,
        },
      });
    }

    if (payment.status === PaymentStatus.CONFIRMED) {
      return payment;
    }

    return this.db.paymentTransaction.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.CONFIRMED,
        confirmedAt: new Date(),
        payloadJson: { quantity },
      },
    });
  }

  async confirmPayment(paymentId: string, providerReference: string, providerPayload?: unknown) {
    const payment = await this.db.paymentTransaction.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error("Pagamento não encontrado.");
    }

    if (payment.status === PaymentStatus.CONFIRMED) {
      return payment;
    }

    const ledger = new CreditLedgerService(this.db);

    await ledger.grant(
      payment.userId,
      payment.creditsAmount,
      "PURCHASE",
      `Compra de créditos via ${payment.provider}`,
      {
        paymentId,
        providerReference,
        providerPayload: toJsonValue(providerPayload ?? {}),
      }
    );

    return this.db.paymentTransaction.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.CONFIRMED,
        confirmedAt: new Date(),
        payloadJson: providerPayload
          ? toJsonValue({ providerPayload })
          : (payment.payloadJson as Prisma.InputJsonValue | undefined),
      },
    });
  }
}
