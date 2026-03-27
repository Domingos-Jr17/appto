import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { parseBody, handleApiError, apiSuccess, apiError } from "@/lib/api";
import { registerSchema } from "@/lib/validators";
import { CreditLedgerService } from "@/lib/credit-ledger";
import { CREDIT_DEFAULTS } from "@/lib/credits";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await parseBody(request, registerSchema);
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return apiError("Este email já está registado", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    new CreditLedgerService(db);

    const user = await db.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: name?.trim() || null,
          email: normalizedEmail,
          password: hashedPassword,
          role: "STUDENT",
        },
      });

      const scopedLedger = new CreditLedgerService(tx);
      await scopedLedger.grant(
        createdUser.id,
        CREDIT_DEFAULTS.initialBalance,
        "BONUS",
        "Créditos iniciais de boas-vindas"
      );

      await tx.subscription.create({
        data: {
          userId: createdUser.id,
          plan: "FREE",
          status: "ACTIVE",
          creditsPerMonth: CREDIT_DEFAULTS.initialBalance,
        },
      });

      await tx.userSettings.create({
        data: {
          userId: createdUser.id,
        },
      });

      return createdUser;
    });

    return apiSuccess(
      {
        message: "Conta criada com sucesso",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return handleApiError(error);
  }
}
