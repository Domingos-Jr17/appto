import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { CREDIT_DEFAULTS } from "@/lib/credits";

// GET /api/credits - Legacy internal credits endpoint
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const { searchParams } = new URL(request.url);
    const includeTransactions = searchParams.get("transactions") === "true";

    const credits = await db.credit.findUnique({
      where: { userId: session.user.id },
    });

    if (!credits) {
      // Create credits if not exists
      const newCredits = await db.credit.create({
        data: {
          userId: session.user.id,
          balance: CREDIT_DEFAULTS.initialBalance,
        },
      });

      return apiSuccess({
        balance: newCredits.balance,
        used: newCredits.used,
        transactions: [],
        archived: true,
        note: "O fluxo público de créditos foi arquivado. Use pacotes e trabalhos extras em /app/subscription.",
      });
    }

    const transactions = includeTransactions
      ? await db.creditTransaction.findMany({
          where: { userId: session.user.id },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : [];

    return apiSuccess({
      balance: credits.balance,
      used: credits.used,
      transactions,
      archived: true,
      note: "O fluxo público de créditos foi arquivado. Use pacotes e trabalhos extras em /app/subscription.",
    });
  } catch (error) {
    console.error("Get credits error:", error);
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  void request;
  return apiError(
    "A compra pública de créditos foi arquivada. Use /app/subscription para gerir pacotes e trabalhos extras.",
    410,
  );
}
