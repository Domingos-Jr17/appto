import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getClientIp } from "@/lib/request";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    await enforceRateLimit(`verify-email:${getClientIp(request) ?? "unknown"}`, 10, 60 * 1000);

    const body = await request.json();
    const { token } = body as { token?: string };

    if (!token) {
      return NextResponse.json(
        { error: "Token de verificação inválido" },
        { status: 400 }
      );
    }

    // Transação atômica
    await db.$transaction(async (tx) => {
      const verificationToken = await tx.verificationToken.findUnique({
        where: { token },
      });

      if (!verificationToken) {
        throw new Error("Link de verificação inválido ou já utilizado");
      }

      if (verificationToken.expires < new Date()) {
        await tx.verificationToken.delete({
          where: { token },
        });
        throw new Error("Link de verificação expirado");
      }

      await tx.user.update({
        where: { email: verificationToken.identifier },
        data: { emailVerified: new Date() },
      });

      await tx.verificationToken.delete({
        where: { token },
      });
    });

    return NextResponse.json({ message: "Email verificado com sucesso" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao verificar email";
    logger.error("verify-email failed", { error: message });
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes("inválido") ? 400 : 500 }
    );
  }
}