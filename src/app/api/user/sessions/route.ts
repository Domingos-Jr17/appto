import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { AuthSecurityService } from "@/lib/auth-security";
import { getSessionTokenFromRequest } from "@/lib/request";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return apiError("Não autorizado", 401);
  }

  const security = new AuthSecurityService(db);
  const sessions = await security.listSessions(
    session.user.id,
    getSessionTokenFromRequest(request) ?? undefined
  );

  return apiSuccess({ sessions });
}
