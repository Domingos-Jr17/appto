import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { buildFunnelSummary } from "@/lib/product-events";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return apiError("Unauthorized", 401);
    }

    const grouped = await db.productEvent.groupBy({
      by: ["name"],
      _count: { name: true },
    });

    return apiSuccess({
      funnel: buildFunnelSummary(grouped),
      grouped,
    });
  } catch (error) {
    return handleApiError(error, "Could not load the metrics summary.");
  }
}
