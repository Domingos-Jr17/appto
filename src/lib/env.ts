import "server-only";

import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    NEXTAUTH_SECRET: z.string().min(1).optional(),
    AUTH_SECRET: z.string().min(1).optional(),
    NEXTAUTH_URL: z.string().url().optional(),
    APP_URL: z.string().url().optional(),
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    ZAI_API_KEY: z.string().min(1).optional(),
    ZAI_BASE_URL: z.string().url().optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM_EMAIL: z.string().email().optional(),
    SENTRY_DSN: z.string().url().optional(),
    PAYMENT_DEFAULT_PROVIDER: z.enum(["SIMULATED", "MPESA", "EMOLA"]).optional(),
    STORAGE_PROVIDER: z.enum(["LOCAL", "R2"]).optional(),
    STORAGE_LOCAL_ROOT: z.string().min(1).optional(),
    R2_ACCOUNT_ID: z.string().min(1).optional(),
    R2_ACCESS_KEY_ID: z.string().min(1).optional(),
    R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    R2_BUCKET: z.string().min(1).optional(),
    R2_PUBLIC_BASE_URL: z.string().url().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.NEXTAUTH_SECRET && !data.AUTH_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AUTH_SECRET"],
        message: "AUTH_SECRET or NEXTAUTH_SECRET must be defined",
      });
    }

    if (data.STORAGE_PROVIDER === "R2") {
      const requiredKeys = [
        "R2_ACCOUNT_ID",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
        "R2_BUCKET",
      ] as const;

      for (const key of requiredKeys) {
        if (!data[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required when STORAGE_PROVIDER=R2`,
          });
        }
      }
    }
  });

const parsedEnv = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  AUTH_SECRET: process.env.AUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  APP_URL: process.env.APP_URL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  ZAI_API_KEY: process.env.ZAI_API_KEY,
  ZAI_BASE_URL: process.env.ZAI_BASE_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  SENTRY_DSN: process.env.SENTRY_DSN,
  PAYMENT_DEFAULT_PROVIDER: process.env.PAYMENT_DEFAULT_PROVIDER,
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
  STORAGE_LOCAL_ROOT: process.env.STORAGE_LOCAL_ROOT,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET: process.env.R2_BUCKET,
  R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,
});

if (!parsedEnv.success) {
  throw new Error(
    `Invalid environment configuration: ${parsedEnv.error.issues
      .map((issue) => `${issue.path.join(".") || "env"} - ${issue.message}`)
      .join("; ")}`
  );
}

export const env = {
  ...parsedEnv.data,
  AUTH_SECRET: parsedEnv.data.NEXTAUTH_SECRET ?? parsedEnv.data.AUTH_SECRET!,
  APP_URL:
    parsedEnv.data.APP_URL ??
    parsedEnv.data.NEXTAUTH_URL ??
    "http://localhost:3000",
  PAYMENT_DEFAULT_PROVIDER: parsedEnv.data.PAYMENT_DEFAULT_PROVIDER ?? "SIMULATED",
  STORAGE_PROVIDER: parsedEnv.data.STORAGE_PROVIDER ?? "LOCAL",
  STORAGE_LOCAL_ROOT: parsedEnv.data.STORAGE_LOCAL_ROOT ?? ".storage",
  isDevelopment: parsedEnv.data.NODE_ENV === "development",
  isProduction: parsedEnv.data.NODE_ENV === "production",
};
