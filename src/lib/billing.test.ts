import { describe, expect, test } from "bun:test";
import { PackageType } from "@prisma/client";

import {
  BILLING_PLANS,
  BILLING_PLAN_DISPLAY,
  EXTRA_WORKS,
  getBillingPlan,
} from "@/lib/billing";

describe("billing catalog", () => {
  test("exposes canonical FREE / STARTER / PRO plans", () => {
    expect(BILLING_PLAN_DISPLAY.map((plan) => plan.key)).toEqual([
      "FREE",
      "STARTER",
      "PRO",
    ]);
  });

  test("matches agreed commercial pricing and limits", () => {
    expect(getBillingPlan(PackageType.FREE)).toMatchObject({
      price: 0,
      worksPerMonth: 1,
    });
    expect(getBillingPlan(PackageType.STARTER)).toMatchObject({
      price: 100,
      worksPerMonth: 4,
    });
    expect(getBillingPlan(PackageType.PRO)).toMatchObject({
      price: 200,
      worksPerMonth: 10,
      hasPdfExport: true,
    });
  });

  test("defines extra works policy as canonical add-on", () => {
    expect(EXTRA_WORKS).toEqual({
      price: 50,
      maxQuantityPerPurchase: 10,
      validityMonths: 3,
      consumptionPriority: "before_plan",
    });
  });

  test("keeps public labels aligned with plan names", () => {
    expect(BILLING_PLANS.FREE.name).toBe("Free");
    expect(BILLING_PLANS.STARTER.name).toBe("Starter");
    expect(BILLING_PLANS.PRO.name).toBe("Pro");
  });
});
