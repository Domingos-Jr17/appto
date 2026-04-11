import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";

import { apiError, apiSuccess, handleApiError, parseBody } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { AuthSecurityService } from "@/lib/auth-security";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { totpSetupSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.email) {
      return apiError("Unauthorized", 401);
    }

    const { currentPassword } = await parseBody(request, totpSetupSchema);
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user?.password) {
      return apiError("Password confirmation is required to enable 2FA on this account.", 400);
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return apiError("Current password is incorrect.", 400);
    }

    const security = new AuthSecurityService(db);
    const setup = await security.createTotpSetup(session.user.id, session.user.email);

    return apiSuccess(setup);
  } catch (error) {
    logger.error("2FA setup failed", { error: String(error) });
    return handleApiError(error);
  }
}
