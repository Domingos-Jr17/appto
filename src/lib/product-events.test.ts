import { describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

async function loadProductEventHelpers() {
  const eventsModule = await import("@/lib/product-events");
  return {
    buildFunnelSummary: eventsModule.buildFunnelSummary,
    normalizeEventMetadata: eventsModule.normalizeEventMetadata,
  };
}

describe("product events", () => {
  test("normalizes metadata to JSON-safe values", async () => {
    const { normalizeEventMetadata } = await loadProductEventHelpers();
    const metadata = normalizeEventMetadata({
      ok: true,
      count: 3,
      nested: { foo: "bar" },
      undefinedValue: undefined,
    });

    expect(metadata).toEqual({
      ok: true,
      count: 3,
      nested: { foo: "bar" },
    });
  });

  test("builds funnel summary from grouped events", async () => {
    const { buildFunnelSummary } = await loadProductEventHelpers();
    const summary = buildFunnelSummary([
      { name: "lead_magnet_generated", _count: { name: 20 } },
      { name: "account_registered", _count: { name: 10 } },
      { name: "subscription_checkout_started", _count: { name: 5 } },
      { name: "payment_confirmed", _count: { name: 2 } },
      { name: "export_saved", _count: { name: 1 } },
    ]);

    expect(summary.leadMagnet).toBe(20);
    expect(summary.registrations).toBe(10);
    expect(summary.checkoutStarted).toBe(5);
    expect(summary.paymentsConfirmed).toBe(2);
    expect(summary.exportsSaved).toBe(1);
  });
});
