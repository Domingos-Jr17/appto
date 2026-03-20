import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE /api/user/delete - Delete user account
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { confirmation } = body;

    // Require confirmation text
    if (confirmation !== "EXCLUIR") {
      return NextResponse.json(
        { error: "Confirmação inválida. Digite 'EXCLUIR' para confirmar." },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Delete user (cascade will delete related data)
    await db.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      success: true,
      message: "Conta eliminada com sucesso",
    });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: "Erro ao eliminar conta" },
      { status: 500 }
    );
  }
}
