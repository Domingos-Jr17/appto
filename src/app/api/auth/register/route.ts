import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

import { apiError, apiSuccess, handleApiError, parseBody } from "@/lib/api";
import { db } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { trackProductEvent } from "@/lib/product-events";
import { getClientIp } from "@/lib/request";
import { enforceRateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(`register:${getClientIp(request) ?? "unknown"}`, 5, 60 * 60 * 1000);

    const { name, email, password } = await parseBody(request, registerSchema);
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return apiError("Não foi possível concluir o registo com os dados informados.", 400, "REGISTRATION_FAILED");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await db.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: name?.trim() || null,
          email: normalizedEmail,
          password: hashedPassword,
          role: "STUDENT",
        },
      });

      await tx.subscription.create({
        data: {
          userId: createdUser.id,
          package: "FREE",
          status: "ACTIVE",
          worksPerMonth: 1,
        },
      });

      await tx.userSettings.create({
        data: {
          userId: createdUser.id,
        },
      });

      return createdUser;
    });

    // Send welcome email (non-blocking)
    sendWelcomeEmail(normalizedEmail, name?.trim() ?? null).catch((err) => {
      logger.error("Failed to send welcome email", { error: String(err), email: normalizedEmail });
    });

    await trackProductEvent({
      name: "account_registered",
      category: "auth",
      userId: user.id,
      metadata: { educationLevel: null },
    }).catch(() => null);

    return apiSuccess(
      {
        message: "Conta criada com sucesso",
        user: {
          id: user.id,
          name: user.name,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Registration error", { error: String(error) });
    return handleApiError(error);
  }
}
