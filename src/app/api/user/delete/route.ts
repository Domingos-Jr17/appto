import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";

import { apiSuccess, handleApiError, parseBody, apiError } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { AuthSecurityService } from "@/lib/auth-security";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { deleteAccountSchema } from "@/lib/validators";

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const { currentPassword, otpCode } = await parseBody(request, deleteAccountSchema);
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
    }

    if (user.twoFactorEnabled) {
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
    logger.error("Delete account error", { error: String(error) });
    return handleApiError(error, "Erro ao eliminar conta");
  }
}
