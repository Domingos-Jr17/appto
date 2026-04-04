import "server-only";

import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    DATABASE_URL_DIRECT: z.string().min(1).optional(),
    NEXTAUTH_SECRET: z.string().min(1).optional(),
    AUTH_SECRET: z.string().min(1).optional(),
    NEXTAUTH_URL: z.string().url().optional(),
    APP_URL: z.string().url().optional(),
    INTERNAL_WORKER_SECRET: z.string().min(1).optional(),
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    ZAI_API_KEY: z.string().min(1).optional(),
    ZAI_BASE_URL: z.string().url().optional(),
    AI_PROVIDER: z.enum(["zai", "openrouter"]).optional(),
    AI_FALLBACK_PROVIDER: z.enum(["zai", "openrouter"]).optional(),
    AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
    RAG_RETRIEVAL_MODE: z.enum(["TEXT", "VECTOR"]).optional(),
    RAG_EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().max(1024).optional(),
    OPENROUTER_API_KEY: z.string().min(1).optional(),
    OPENROUTER_BASE_URL: z.string().url().optional(),
    OPENROUTER_MODEL: z.string().min(1).optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM_EMAIL: z.string().email().optional(),
    SENTRY_DSN: z.string().url().optional(),
    PAYMENT_GATEWAY: z.enum(["SIMULATED", "PAYSUITE"]).optional(),
    PAYMENT_DEFAULT_PROVIDER: z.enum(["SIMULATED", "MPESA", "EMOLA"]).optional(),
    PAYSUITE_API_BASE_URL: z.string().url().optional(),
    PAYSUITE_API_TOKEN: z.string().min(1).optional(),
    PAYSUITE_CALLBACK_BASE_URL: z.string().url().optional(),
    RATE_LIMIT_PROVIDER: z.enum(["MEMORY", "UPSTASH"]).optional(),
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
    STORAGE_PROVIDER: z.enum(["LOCAL", "R2"]).optional(),
    STORAGE_LOCAL_ROOT: z.string().min(1).optional(),
    R2_ACCOUNT_ID: z.string().min(1).optional(),
    R2_ACCESS_KEY_ID: z.string().min(1).optional(),
    R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    R2_BUCKET: z.string().min(1).optional(),
    R2_PUBLIC_BASE_URL: z.string().url().optional(),
    PAYMENT_WEBHOOK_SECRET: z.string().min(1).optional(),
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

    if (data.PAYMENT_GATEWAY === "PAYSUITE") {
      const requiredKeys = [
        "PAYSUITE_API_TOKEN",
        "PAYMENT_WEBHOOK_SECRET",
      ] as const;

      for (const key of requiredKeys) {
        if (!data[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required when PAYMENT_GATEWAY=PAYSUITE`,
          });
        }
      }
    }

    if (data.RATE_LIMIT_PROVIDER === "UPSTASH") {
      const requiredKeys = [
        "UPSTASH_REDIS_REST_URL",
        "UPSTASH_REDIS_REST_TOKEN",
      ] as const;

      for (const key of requiredKeys) {
        if (!data[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required when RATE_LIMIT_PROVIDER=UPSTASH`,
          });
        }
      }
    }

    if (data.RAG_EMBEDDING_DIMENSIONS && data.RAG_EMBEDDING_DIMENSIONS !== 128) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["RAG_EMBEDDING_DIMENSIONS"],
        message: "RAG_EMBEDDING_DIMENSIONS must be 128 to match the pgvector schema",
      });
    }
  });

const parsedEnv = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_URL_DIRECT: process.env.DATABASE_URL_DIRECT,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  AUTH_SECRET: process.env.AUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  APP_URL: process.env.APP_URL,
  INTERNAL_WORKER_SECRET: process.env.INTERNAL_WORKER_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  ZAI_API_KEY: process.env.ZAI_API_KEY,
  ZAI_BASE_URL: process.env.ZAI_BASE_URL,
  AI_PROVIDER: process.env.AI_PROVIDER,
  AI_FALLBACK_PROVIDER: process.env.AI_FALLBACK_PROVIDER,
  AI_REQUEST_TIMEOUT_MS: process.env.AI_REQUEST_TIMEOUT_MS,
  RAG_RETRIEVAL_MODE: process.env.RAG_RETRIEVAL_MODE,
  RAG_EMBEDDING_DIMENSIONS: process.env.RAG_EMBEDDING_DIMENSIONS,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL,
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    SENTRY_DSN: process.env.SENTRY_DSN,
    PAYMENT_GATEWAY: process.env.PAYMENT_GATEWAY,
    PAYMENT_DEFAULT_PROVIDER: process.env.PAYMENT_DEFAULT_PROVIDER,
    PAYSUITE_API_BASE_URL: process.env.PAYSUITE_API_BASE_URL,
    PAYSUITE_API_TOKEN: process.env.PAYSUITE_API_TOKEN,
    PAYSUITE_CALLBACK_BASE_URL: process.env.PAYSUITE_CALLBACK_BASE_URL,
    RATE_LIMIT_PROVIDER: process.env.RATE_LIMIT_PROVIDER,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
  STORAGE_LOCAL_ROOT: process.env.STORAGE_LOCAL_ROOT,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET: process.env.R2_BUCKET,
    R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,
    PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET,
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
  INTERNAL_WORKER_SECRET: parsedEnv.data.INTERNAL_WORKER_SECRET,
  PAYMENT_GATEWAY: parsedEnv.data.PAYMENT_GATEWAY ?? "SIMULATED",
  PAYMENT_DEFAULT_PROVIDER: parsedEnv.data.PAYMENT_DEFAULT_PROVIDER ?? "SIMULATED",
  PAYSUITE_API_BASE_URL:
    parsedEnv.data.PAYSUITE_API_BASE_URL ?? "https://paysuite.tech",
  RATE_LIMIT_PROVIDER: parsedEnv.data.RATE_LIMIT_PROVIDER ?? "MEMORY",
  STORAGE_PROVIDER: parsedEnv.data.STORAGE_PROVIDER ?? "LOCAL",
  STORAGE_LOCAL_ROOT: parsedEnv.data.STORAGE_LOCAL_ROOT ?? ".storage",
  AI_PROVIDER: parsedEnv.data.AI_PROVIDER ?? "openrouter",
  AI_FALLBACK_PROVIDER: parsedEnv.data.AI_FALLBACK_PROVIDER,
  AI_REQUEST_TIMEOUT_MS: parsedEnv.data.AI_REQUEST_TIMEOUT_MS ?? 8_000,
  RAG_RETRIEVAL_MODE: parsedEnv.data.RAG_RETRIEVAL_MODE ?? "TEXT",
  RAG_EMBEDDING_DIMENSIONS: parsedEnv.data.RAG_EMBEDDING_DIMENSIONS ?? 128,
  isDevelopment: parsedEnv.data.NODE_ENV === "development",
  isProduction: parsedEnv.data.NODE_ENV === "production",
};
