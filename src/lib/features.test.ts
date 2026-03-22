import { describe, expect, test } from "bun:test";

import { featureRegistry, isFeaturePublic, isFeatureVisible } from "@/lib/features";

describe("feature registry", () => {
  test("keeps unsupported claims out of the public marketing surface", () => {
    expect(featureRegistry.localRag).toBe("hidden");
    expect(featureRegistry.pdfExport).toBe("beta");
    expect(featureRegistry.twoFactorAuth).toBe("beta");
    expect(featureRegistry.passwordReset).toBe("beta");
    expect(isFeaturePublic("transparentCredits")).toBe(true);
    expect(isFeatureVisible("landingTestimonials")).toBe(false);
  });
});
