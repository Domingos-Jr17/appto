import { NextRequest } from "next/server";
import { apiSuccess, handleApiError, parseBody } from "@/lib/api";
import { resetPasswordSchema } from "@/lib/validators";
import { AuthSecurityService } from "@/lib/auth-security";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await parseBody(request, resetPasswordSchema);

    await enforceRateLimit(`reset-password:${token.slice(0, 8)}`, 10, 1000 * 60 * 10);

    const security = new AuthSecurityService(db);
    await security.resetPassword(token, password);

    return apiSuccess({
      success: true,
      message: "Senha redefinida com sucesso.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
