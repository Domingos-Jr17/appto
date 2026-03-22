import type { Prisma, PrismaClient } from "@prisma/client";
import { CREDIT_DEFAULTS } from "@/lib/credits";

type DbClient = PrismaClient | Prisma.TransactionClient;

export class CreditLedgerService {
  constructor(private readonly db: DbClient) {}

  async getOrCreate(userId: string) {
    const credits = await this.db.credit.findUnique({
      where: { userId },
    });

    if (credits) {
      return credits;
    }

    return this.db.credit.create({
      data: {
        userId,
        balance: CREDIT_DEFAULTS.initialBalance,
      },
    });
  }

  async charge(userId: string, amount: number, description: string, metadata?: Prisma.InputJsonValue) {
    const credits = await this.getOrCreate(userId);

    if (credits.balance < amount) {
      throw new Error(`Créditos insuficientes. Necessário: ${amount} créditos.`);
    }

    const updated = await this.db.credit.update({
      where: { userId },
      data: {
        balance: { decrement: amount },
        used: { increment: amount },
      },
    });

    await this.db.creditTransaction.create({
      data: {
        userId,
        amount: -amount,
        type: "USAGE",
        description,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      },
    });

    return updated;
  }

  async grant(
    userId: string,
    amount: number,
    type: "BONUS" | "PURCHASE" | "REFUND" | "SUBSCRIPTION",
    description: string,
    metadata?: Prisma.InputJsonValue
  ) {
    await this.getOrCreate(userId);

    const updated = await this.db.credit.update({
      where: { userId },
      data: {
        balance: { increment: amount },
      },
    });

    await this.db.creditTransaction.create({
      data: {
        userId,
        amount,
        type,
        description,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      },
    });

    return updated;
  }
}
