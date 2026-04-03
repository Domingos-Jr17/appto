import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { subscriptionService } from "@/lib/subscription";

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({
        authenticated: false,
        session: null,
        message: "No valid session found",
      });
    }

    const subscription = await subscriptionService.canGenerateWork(session.user.id);
    const subStatus = await subscriptionService.getSubscriptionStatus(session.user.id);

    return NextResponse.json({
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
        plan: subStatus.plan,
        status: subStatus.status,
        worksPerMonth: subStatus.worksPerMonth,
        worksUsed: subStatus.worksUsed,
        remaining: subStatus.remaining,
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: "Debug endpoint failed",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
