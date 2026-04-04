import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { apiError, apiSuccess, handleApiError, parseBody } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { AuthSecurityService } from "@/lib/auth-security";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";
import { totpVerifySchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    await enforceRateLimit(`2fa-verify:${session.user.id}`, 10, 10 * 60 * 1000);

    const { code } = await parseBody(request, totpVerifySchema);
    const security = new AuthSecurityService(db);
    const result = await security.verifyTotpCode(session.user.id, code, true);

    return apiSuccess({
      success: true,
      recoveryCodes: result.recoveryCodes,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
