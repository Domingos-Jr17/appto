import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { apiError, apiSuccess, handleApiError, parseBody } from "@/lib/api";
import { disableTotpSchema } from "@/lib/validators";
import { AuthSecurityService } from "@/lib/auth-security";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const { currentPassword, otpCode } = await parseBody(request, disableTotpSchema);
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return apiError("Utilizador não encontrado", 404);
    }

    if (user.password && currentPassword) {
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return apiError("Senha actual incorreta.", 400);
      }
    } else if (otpCode) {
      const security = new AuthSecurityService(db);
      await security.verifyTotpCode(session.user.id, otpCode, false);
    } else {
      return apiError("Confirmação de senha ou código 2FA é obrigatória.", 400);
    }

    const security = new AuthSecurityService(db);
    await security.disableTotp(session.user.id);

    return apiSuccess({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
