import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/credits - Get user's credit balance and transactions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeTransactions = searchParams.get("transactions") === "true";

    const credits = await db.credit.findUnique({
      where: { userId: session.user.id },
      include: includeTransactions
        ? {
            user: {
              include: {
                transactions: {
                  orderBy: { createdAt: "desc" },
                  take: 50,
                },
              },
            },
          }
        : undefined,
    });

    if (!credits) {
      // Create credits if not exists
      const newCredits = await db.credit.create({
        data: {
          userId: session.user.id,
          balance: 150,
        },
      });

      return NextResponse.json({
        balance: newCredits.balance,
        used: newCredits.used,
        transactions: [],
      });
    }

    const transactions = includeTransactions
      ? await db.creditTransaction.findMany({
          where: { userId: session.user.id },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : [];

    return NextResponse.json({
      balance: credits.balance,
      used: credits.used,
      transactions,
    });
  } catch (error) {
    console.error("Get credits error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// POST /api/credits/purchase - Purchase credits (simulated payment)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, paymentMethod } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Quantidade inválida" },
        { status: 400 }
      );
    }

    // Credit packages
    const packages: Record<string, { credits: number; price: number }> = {
      starter: { credits: 500, price: 100 },
      basic: { credits: 1500, price: 250 },
      pro: { credits: 5000, price: 700 },
      academic: { credits: 15000, price: 1800 },
    };

    const selectedPackage = packages[amount.toString()] || {
      credits: amount,
      price: amount * 0.2,
    };

    // In production, this would integrate with M-Pesa/e-Mola
    // For now, we'll simulate a successful payment

    const result = await db.$transaction([
      // Update credits
      db.credit.update({
        where: { userId: session.user.id },
        data: {
          balance: { increment: selectedPackage.credits },
        },
      }),
      // Create transaction record
      db.creditTransaction.create({
        data: {
          userId: session.user.id,
          amount: selectedPackage.credits,
          type: "PURCHASE",
          description: `Compra via ${paymentMethod || "simulado"}`,
          metadata: JSON.stringify({
            package: amount,
            price: selectedPackage.price,
            paymentMethod,
          }),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      creditsAdded: selectedPackage.credits,
      newBalance: result[0].balance,
      message: "Créditos adicionados com sucesso",
    });
  } catch (error) {
    console.error("Purchase credits error:", error);
    return NextResponse.json(
      { error: "Erro ao processar pagamento" },
      { status: 500 }
    );
  }
}
