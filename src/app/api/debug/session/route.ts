import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { subscriptionService } from "@/lib/subscription";
import { db } from "@/lib/db";
import { PaymentStatus } from "@prisma/client";

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({
        authenticated: false,
        session: null,
        message: "No valid session found",
      });
    }

    const subscription = await subscriptionService.canGenerateWork(session.user.id);
    const subStatus = await subscriptionService.getSubscriptionStatus(session.user.id);

    return NextResponse.json({
      authenticated: true,
      session: {
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
      subscription: {
        canGenerate: subscription.allowed,
        reason: subscription.reason,
        remaining: subscription.remaining,
      },
      subStatus: {
        plan: subStatus.plan,
        status: subStatus.status,
        worksPerMonth: subStatus.worksPerMonth,
        worksUsed: subStatus.worksUsed,
        planRemaining: subStatus.planRemaining,
        extraWorks: subStatus.extraWorks,
        remaining: subStatus.remaining,
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: "Debug endpoint failed",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === "backfill-extra-works") {
      const confirmedPayments = await db.paymentTransaction.findMany({
        where: {
          userId: session.user.id,
          status: PaymentStatus.CONFIRMED,
        },
      });

      const existingPurchases = await db.workPurchase.findMany({
        where: { userId: session.user.id },
      });

      let backfilled = 0;

      for (const payment of confirmedPayments) {
        const payload = payment.payloadJson as Record<string, unknown> | null;
        if (payload?.purchaseType !== "extra_work") continue;

        const quantity = (payload.quantity as number) || 0;
        if (quantity <= 0) continue;

        const alreadyExists = existingPurchases.some(
          (p) => p.pricePaid === payment.moneyAmount && p.quantity === quantity
        );

        if (!alreadyExists) {
          const expiresAt = new Date(payment.confirmedAt || payment.createdAt);
          expiresAt.setMonth(expiresAt.getMonth() + 3);

          await db.workPurchase.create({
            data: {
              userId: session.user.id,
              quantity,
              pricePaid: payment.moneyAmount,
              used: 0,
              expiresAt,
            },
          });

          backfilled++;
        }
      }

      return NextResponse.json({
        success: true,
        backfilled,
        message: backfilled > 0
          ? `${backfilled} trabalho(s) extra(s) recuperado(s)`
          : "Nenhum trabalho extra pendente para recuperar",
      });
    }

    return NextResponse.json({ error: "Acção inválida" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({
      error: "Backfill failed",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
