import { describe, expect, mock, test } from "bun:test";
import { PackageType, SubscriptionStatus } from "@prisma/client";

mock.module("server-only", () => ({}));

async function loadSubscriptionService() {
  const subscriptionModule = await import("@/lib/subscription");
  return subscriptionModule.SubscriptionService;
}

describe("SubscriptionService", () => {
  test("allows only free-safe AI actions on FREE", async () => {
    const SubscriptionService = await loadSubscriptionService();
    const db = {
      subscription: {
        findUnique: mock(async () => ({
          userId: "user_1",
          package: PackageType.FREE,
          status: SubscriptionStatus.ACTIVE,
          worksPerMonth: 1,
          worksUsed: 0,
          lastUsageReset: new Date(),
        })),
      },
    };

    const service = new SubscriptionService(db as never);

    await expect(service.canUseAIAction("user_1", "references")).resolves.toEqual({ allowed: true });
    await expect(service.canUseAIAction("user_1", "generate-section")).resolves.toMatchObject({
      allowed: false,
    });
  });

  test("consumes extra works before plan quota", async () => {
    const SubscriptionService = await loadSubscriptionService();
    const executeRaw = mock(async () => 1);
    const db = {
      subscription: {
        findUnique: mock(async () => ({
          userId: "user_1",
          package: PackageType.STARTER,
          status: SubscriptionStatus.ACTIVE,
          worksPerMonth: 4,
          worksUsed: 1,
          lastUsageReset: new Date(),
        })),
        update: mock(async () => null),
      },
      workPurchase: {
        findMany: mock(async () => [
          {
            id: "extra_1",
            userId: "user_1",
            quantity: 2,
            used: 0,
            expiresAt: new Date(Date.now() + 60_000),
          },
        ]),
      },
      $transaction: mock(async (fn) => fn(db)),
      $executeRaw: executeRaw,
    };

    const service = new SubscriptionService(db as never);
    await service.consumeWork("user_1");

    expect(executeRaw).toHaveBeenCalled();
  });

  test("preserves used quota on downgrade when usage still fits new plan", async () => {
    const SubscriptionService = await loadSubscriptionService();
    const subscriptionUpdate = mock(async () => null);
    const workPurchaseCreate = mock(async () => null);
    const db = {
      subscription: {
        findUnique: mock(async () => ({
          userId: "user_1",
          package: PackageType.PRO,
          status: SubscriptionStatus.ACTIVE,
          worksPerMonth: 10,
          worksUsed: 3,
          lastUsageReset: new Date(),
        })),
        update: subscriptionUpdate,
      },
      workPurchase: {
        create: workPurchaseCreate,
      },
    };

    const service = new SubscriptionService(db as never);
    await service.activatePackage("user_1", PackageType.STARTER);

    expect(workPurchaseCreate).not.toHaveBeenCalled();
    expect(subscriptionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ worksUsed: 3 }),
      }),
    );
  });
});
