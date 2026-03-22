import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { apiSuccess, handleApiError, parseBody, apiError } from "@/lib/api";
import { changePasswordSchema } from "@/lib/validators";
import { AuthSecurityService } from "@/lib/auth-security";
import { AuthSessionEvent } from "@prisma/client";

// POST /api/user/password - Change user password
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await parseBody(
      request,
      changePasswordSchema
    );

    // Get user with password
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true },
    });

    if (!user) {
      return apiError("Utilizador não encontrado", 404);
    }

    // Check if user has a password (might be OAuth-only user)
    if (!user.password) {
      return apiError(
        "Esta conta usa autenticação social. Não é possível alterar a senha.",
        400
      );
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return apiError("Senha actual incorreta", 400);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await db.user.update({
      where: { id: session.user.id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      },
    });

    const security = new AuthSecurityService(db);
    await security.recordSessionEvent(
      session.user.id,
      null,
      AuthSessionEvent.PASSWORD_CHANGED
    );

    return apiSuccess({
      success: true,
      message: "Senha alterada com sucesso",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return handleApiError(error);
  }
}
