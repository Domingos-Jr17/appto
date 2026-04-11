import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { AuthSessionEvent } from "@prisma/client";

import { apiSuccess, handleApiError, parseBody, apiError } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { AuthSecurityService } from "@/lib/auth-security";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { changePasswordSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { currentPassword, newPassword } = await parseBody(request, changePasswordSchema);
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true },
    });

    if (!user) {
      return apiError("User not found", 404);
    }

    if (!user.password) {
      return apiError(
        "This account uses social authentication. Password changes are not available.",
        400,
      );
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return apiError("Current password is incorrect", 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await db.$transaction([
      db.user.update({
        where: { id: session.user.id },
        data: {
          password: hashedPassword,
          passwordChangedAt: new Date(),
        },
      }),
      db.session.deleteMany({ where: { userId: session.user.id } }),
    ]);

    const security = new AuthSecurityService(db);
    await security.recordSessionEvent(session.user.id, null, AuthSessionEvent.PASSWORD_CHANGED);

    return apiSuccess({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    logger.error("Change password error", { error: String(error) });
    return handleApiError(error);
  }
}
