import { describe, expect, test } from "bun:test";

import { featureRegistry, isFeaturePublic, isFeatureVisible } from "@/lib/features";

describe("feature registry", () => {
  test("keeps unsupported public claims hidden", () => {
    expect(featureRegistry.localRag).toBe("hidden");
    expect(featureRegistry.pdfExport).toBe("hidden");
    expect(isFeaturePublic("transparentCredits")).toBe(true);
    expect(isFeatureVisible("landingTestimonials")).toBe(false);
  });
});
