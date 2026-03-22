import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { apiSuccess, handleApiError, parseBody, apiError } from "@/lib/api";
import { deleteAccountSchema } from "@/lib/validators";
import { AuthSecurityService } from "@/lib/auth-security";

// DELETE /api/user/delete - Delete user account
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { confirmation, currentPassword, otpCode } = await parseBody(
      request,
      deleteAccountSchema
    );

    const userId = session.user.id;

    const user = await db.user.findUnique({
      where: { id: userId },
      include: { totpCredential: true },
    });

    if (!user) {
      return apiError("Utilizador não encontrado", 404);
    }

    if (user.password) {
      if (!currentPassword) {
        return apiError("A senha actual é obrigatória para eliminar a conta.", 400);
      }

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return apiError("Senha actual incorreta.", 400);
      }
    } else if (user.twoFactorEnabled) {
      if (!otpCode) {
        return apiError("É necessário um código 2FA para eliminar esta conta.", 400);
      }

      const security = new AuthSecurityService(db);
      await security.verifyTotpCode(user.id, otpCode, false);
    }

    await db.user.delete({
      where: { id: userId },
    });

    return apiSuccess({
      success: true,
      message: "Conta eliminada com sucesso",
    });
  } catch (error) {
    console.error("Delete account error:", error);
    return handleApiError(error, "Erro ao eliminar conta");
  }
}
