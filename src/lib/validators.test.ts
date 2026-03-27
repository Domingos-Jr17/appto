import { describe, expect, test } from "bun:test";

import {
  registerSchema,
  forgotPasswordSchema,
  createProjectSchema,
  paymentCheckoutSchema,
} from "@/lib/validators";
import { userSettingsSchema, DEFAULT_USER_SETTINGS } from "@/lib/user-settings";
import { CREDIT_PACKAGES, CREDIT_PACKAGES_DISPLAY, CREDIT_DEFAULTS } from "@/lib/credits";

describe("registerSchema", () => {
  const valid = {
    name: "João Silva",
    email: "joao@example.com",
    password: "StrongP@ss1",
  };

  test("accepts valid input", () => {
    expect(() => registerSchema.parse(valid)).not.toThrow();
  });

  test("rejects short password", () => {
    expect(() =>
      registerSchema.parse({ ...valid, password: "short" })
    ).toThrow();
  });

  test("rejects invalid email", () => {
    expect(() =>
      registerSchema.parse({ ...valid, email: "not-an-email" })
    ).toThrow();
  });

  test("accepts empty name (optional)", () => {
    expect(() =>
      registerSchema.parse({ ...valid, name: "" })
    ).not.toThrow();
  });

  test("rejects missing email", () => {
    const { email: _, ...noEmail } = valid;
    expect(() => registerSchema.parse(noEmail)).toThrow();
  });

  test("rejects missing password", () => {
    const { password: _, ...noPw } = valid;
    expect(() => registerSchema.parse(noPw)).toThrow();
  });
});

describe("forgotPasswordSchema", () => {
  test("accepts valid email", () => {
    expect(() =>
      forgotPasswordSchema.parse({ email: "user@example.com" })
    ).not.toThrow();
  });

  test("rejects invalid email", () => {
    expect(() =>
      forgotPasswordSchema.parse({ email: "bad" })
    ).toThrow();
  });

  test("rejects missing email", () => {
    expect(() => forgotPasswordSchema.parse({})).toThrow();
  });
});

describe("createProjectSchema", () => {
  const valid = {
    title: "Meu TCC",
    description: "Descrição do projeto",
    type: "MONOGRAPHY" as const,
  };

  test("accepts valid project", () => {
    expect(() => createProjectSchema.parse(valid)).not.toThrow();
  });

  test("rejects empty title", () => {
    expect(() =>
      createProjectSchema.parse({ ...valid, title: "" })
    ).toThrow();
  });

  test("rejects invalid type", () => {
    expect(() =>
      createProjectSchema.parse({ ...valid, type: "INVALID" })
    ).toThrow();
  });

  test("defaults type to MONOGRAPHY when omitted", () => {
    const result = createProjectSchema.parse({
      title: "Projeto",
    });
    expect(result.type).toBe("MONOGRAPHY");
  });
});

describe("userSettingsSchema", () => {
  test("accepts valid settings", () => {
    expect(() =>
      userSettingsSchema.parse({
        language: "pt-MZ",
        citationStyle: "ABNT",
        fontSize: 16,
        autoSave: true,
        aiTone: "formal",
        emailNotifications: true,
        pushNotifications: false,
      })
    ).not.toThrow();
  });

  test("provides defaults for empty input", () => {
    const result = userSettingsSchema.parse({});
    expect(result.language).toBe("pt-MZ");
    expect(result.citationStyle).toBe("ABNT");
    expect(result.fontSize).toBe(16);
    expect(result.autoSave).toBe(true);
  });

  test("rejects invalid language", () => {
    expect(() =>
      userSettingsSchema.parse({ language: "fr" })
    ).toThrow();
  });

  test("rejects invalid citation style", () => {
    expect(() =>
      userSettingsSchema.parse({ citationStyle: "INVALID" })
    ).toThrow();
  });

  test("defaults match DEFAULT_USER_SETTINGS", () => {
    const result = userSettingsSchema.parse({});
    expect(result).toEqual(DEFAULT_USER_SETTINGS);
  });
});

describe("paymentCheckoutSchema", () => {
  test("accepts valid package key", () => {
    expect(() =>
      paymentCheckoutSchema.parse({ packageKey: "starter" })
    ).not.toThrow();
  });

  test("rejects invalid package key", () => {
    expect(() =>
      paymentCheckoutSchema.parse({ packageKey: "invalid" })
    ).toThrow();
  });
});

describe("credit packages consistency", () => {
  test("display catalog matches API catalog keys", () => {
    const apiKeys: string[] = Object.keys(CREDIT_PACKAGES);
    const displayKeys: string[] = CREDIT_PACKAGES_DISPLAY.map((pkg) => pkg.key);
    expect(displayKeys.sort()).toEqual(apiKeys.sort());
  });

  test("display catalog prices match API catalog", () => {
    for (const pkg of CREDIT_PACKAGES_DISPLAY) {
      const apiPkg = CREDIT_PACKAGES[pkg.key];
      expect(pkg.price).toBe(apiPkg.price);
      expect(pkg.credits).toBe(apiPkg.credits);
      expect(pkg.currency).toBe(apiPkg.currency);
    }
  });

  test("initial balance is defined", () => {
    expect(CREDIT_DEFAULTS.initialBalance).toBeGreaterThan(0);
  });

  test("export costs are positive", () => {
    expect(CREDIT_DEFAULTS.exportDocx).toBeGreaterThan(0);
    expect(CREDIT_DEFAULTS.exportPdf).toBeGreaterThan(0);
  });
});
