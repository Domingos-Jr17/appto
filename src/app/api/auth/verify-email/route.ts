import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body as { token?: string };

    if (!token) {
      return NextResponse.json(
        { error: "Token de verificação inválido" },
        { status: 400 }
      );
    }

    const verificationToken = await db.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: "Link de verificação inválido ou já utilizado" },
        { status: 400 }
      );
    }

    if (verificationToken.expires < new Date()) {
      await db.verificationToken.delete({
        where: { token },
      });
      return NextResponse.json(
        { error: "Link de verificação expirado" },
        { status: 400 }
      );
    }

    await db.user.update({
      where: { email: verificationToken.identifier },
      data: { emailVerified: new Date() },
    });

    await db.verificationToken.delete({
      where: { token },
    });

    return NextResponse.json({ message: "Email verificado com sucesso" });
  } catch {
    return NextResponse.json(
      { error: "Erro ao verificar email" },
      { status: 500 }
    );
  }
}
