import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export function normalizeEventMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue;
}

export async function trackProductEvent(input: {
  name: string;
  category: string;
  userId?: string | null;
  projectId?: string | null;
  paymentId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const metadata = normalizeEventMetadata(input.metadata);

  logger.info("[product-event] tracked", {
    name: input.name,
    category: input.category,
    userId: input.userId,
    projectId: input.projectId,
    paymentId: input.paymentId,
  });

  return db.productEvent.create({
    data: {
      name: input.name,
      category: input.category,
      userId: input.userId ?? undefined,
      projectId: input.projectId ?? undefined,
      paymentId: input.paymentId ?? undefined,
      metadata,
    },
  });
}

export function buildFunnelSummary(
  grouped: Array<{ name: string; _count: { name: number } }>,
) {
  const counts = Object.fromEntries(grouped.map((item) => [item.name, item._count.name]));

  return {
    leadMagnet: counts.lead_magnet_generated ?? 0,
    registrations: counts.account_registered ?? 0,
    checkoutStarted: counts.subscription_checkout_started ?? 0,
    paymentsConfirmed: counts.payment_confirmed ?? 0,
    exportsSaved: counts.export_saved ?? 0,
  };
}
