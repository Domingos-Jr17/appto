import crypto from "node:crypto";
import { PaymentProvider as PaymentProviderEnum, PaymentStatus, type Prisma, type PrismaClient } from "@prisma/client";
import { CREDIT_PACKAGES, type CreditPackageKey } from "@/lib/credits";
import { CreditLedgerService } from "@/lib/credit-ledger";

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

export interface PaymentProviderContract {
  provider: PaymentProviderEnum;
  createCheckout(input: { paymentId: string; packageKey: CreditPackageKey }): Promise<CheckoutResult>;
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
