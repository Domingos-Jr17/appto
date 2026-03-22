import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { AuthSecurityService } from "@/lib/auth-security";

export async function POST(_request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.email) {
    return apiError("Não autorizado", 401);
  }

  const security = new AuthSecurityService(db);
  const setup = await security.createTotpSetup(session.user.id, session.user.email);

  return apiSuccess(setup);
}
