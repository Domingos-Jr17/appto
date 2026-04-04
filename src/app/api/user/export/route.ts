import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { apiError, handleApiError } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        projects: {
          include: {
            sections: true,
          },
        },
        credits: true,
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 100,
        },
        subscription: true,
        settings: true,
      },
    });

    if (!user) {
      return apiError("Utilizador não encontrado", 404);
    }

    const exportData = {
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      projects: user.projects.map((p) => ({
        title: p.title,
        description: p.description,
        type: p.type,
        status: p.status,
        wordCount: p.wordCount,
        createdAt: p.createdAt,
        sections: p.sections.map((s) => ({
          title: s.title,
          content: s.content,
          wordCount: s.wordCount,
          createdAt: s.createdAt,
        })),
      })),
      credits: user.credits
        ? {
            balance: user.credits.balance,
            used: user.credits.used,
          }
        : null,
      transactions: user.transactions.map((t) => ({
        amount: t.amount,
        type: t.type,
        description: t.description,
        createdAt: t.createdAt,
      })),
      subscription: user.subscription
        ? {
            package: user.subscription.package,
            status: user.subscription.status,
            startDate: user.subscription.startDate,
          }
        : null,
      settings: user.settings,
      exportedAt: new Date().toISOString(),
    };

    const jsonStr = JSON.stringify(exportData, null, 2);

    return new NextResponse(jsonStr, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="aptto-data-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    logger.error("Export data error", { error: String(error) });
    return handleApiError(error);
  }
}
