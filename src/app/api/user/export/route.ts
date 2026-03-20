import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/user/export - Export user data
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Get all user data
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
      return NextResponse.json(
        { error: "Utilizador não encontrado" },
        { status: 404 }
      );
    }

    // Remove sensitive data
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
      credits: user.credits ? {
        balance: user.credits.balance,
        used: user.credits.used,
      } : null,
      transactions: user.transactions.map((t) => ({
        amount: t.amount,
        type: t.type,
        description: t.description,
        createdAt: t.createdAt,
      })),
      subscription: user.subscription ? {
        plan: user.subscription.plan,
        status: user.subscription.status,
        startDate: user.subscription.startDate,
      } : null,
      settings: user.settings,
      exportedAt: new Date().toISOString(),
    };

    // Return as JSON file download
    const jsonStr = JSON.stringify(exportData, null, 2);
    
    return new NextResponse(jsonStr, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="aptto-data-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Export data error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
