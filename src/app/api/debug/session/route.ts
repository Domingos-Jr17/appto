import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { subscriptionService } from "@/lib/subscription";

async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function GET(_request: NextRequest) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return apiError("Não autorizado", 403);
    }

    const subscription = await subscriptionService.canGenerateWork(session.user.id);
    const subStatus = await subscriptionService.getSubscriptionStatus(session.user.id);

    return apiSuccess({
      authenticated: true,
      session: {
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
      subscription: {
        canGenerate: subscription.allowed,
        reason: subscription.reason,
        remaining: subscription.remaining,
      },
      subStatus: {
        package: subStatus.package,
        status: subStatus.status,
        worksPerMonth: subStatus.worksPerMonth,
        worksUsed: subStatus.worksUsed,
        planRemaining: subStatus.planRemaining,
        extraWorks: subStatus.extraWorks,
        remaining: subStatus.remaining,
      },
    });
  } catch (error) {
    logger.error("Debug session endpoint failed", { error: String(error) });
    return handleApiError(error);
  }
}

export async function POST(_request: NextRequest) {
  return apiError("Endpoint de depuração descontinuado.", 410, "DEPRECATED_ENDPOINT");
}
