import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess, handleApiError, parseBody } from "@/lib/api";
import { totpVerifySchema } from "@/lib/validators";
import { AuthSecurityService } from "@/lib/auth-security";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

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
