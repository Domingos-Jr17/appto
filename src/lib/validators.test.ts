import { describe, expect, test } from "bun:test";

import {
  registerSchema,
  forgotPasswordSchema,
  createProjectSchema,
} from "@/lib/validators";

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
