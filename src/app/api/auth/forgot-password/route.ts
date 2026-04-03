import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, handleApiError, parseBody } from "@/lib/api";
import { forgotPasswordSchema } from "@/lib/validators";
import { AuthSecurityService } from "@/lib/auth-security";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const { email } = await parseBody(request, forgotPasswordSchema);
    const normalizedEmail = email.trim().toLowerCase();

    await enforceRateLimit(`forgot-password:${normalizedEmail}`, 5, 1000 * 60 * 10);

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      const security = new AuthSecurityService(db);
      await security.createPasswordResetToken(user.id, user.email);
    }

    return apiSuccess({
      success: true,
      message:
        "Se existir uma conta com este email, foi enviado um link de redefinição.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
