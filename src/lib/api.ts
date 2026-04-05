import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { logger } from "@/lib/logger";
import { RateLimitError } from "@/lib/rate-limit-core";

export class ApiRouteError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status = 400, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiRouteError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function getRequestIdHeader() {
  try {
    const headerStore = await headers();
    return headerStore.get("x-request-id") ?? undefined;
  } catch {
    return undefined;
  }
}

function buildHeaders(init?: ResponseInit, requestId?: string) {
  const baseHeaders = new Headers(init?.headers);
  if (requestId) {
    baseHeaders.set("x-request-id", requestId);
  }
  return baseHeaders;
}

export async function apiSuccess<T>(data: T, init?: ResponseInit) {
  const requestId = await getRequestIdHeader();
  return NextResponse.json(data, {
    ...init,
    headers: buildHeaders(init, requestId),
  });
}

export async function apiError(
  error: string,
  status = 400,
  code?: string,
  details?: unknown,
) {
  const requestId = await getRequestIdHeader();
  return NextResponse.json(
    {
      error,
      code,
      ...(details !== undefined ? { details } : {}),
    },
    {
      status,
      headers: buildHeaders(undefined, requestId),
    },
  );
}

export async function parseBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiRouteError("Pedido inválido", 400, "INVALID_JSON");
  }
  return schema.parse(body);
}

export function getZodErrorDetails(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export async function handleApiError(error: unknown, fallback = "Erro interno do servidor") {
  if (error instanceof ZodError) {
    return apiError("Pedido inválido", 400, "VALIDATION_ERROR", getZodErrorDetails(error));
  }

  if (error instanceof RateLimitError) {
    return apiError(error.message, 429, "RATE_LIMITED");
  }

  if (error instanceof ApiRouteError) {
    return apiError(error.message, error.status, error.code, error.details);
  }

  if (error instanceof Error) {
    logger.error("Unhandled API error", {
      message: error.message,
      stack: error.stack,
      fallback,
    });
    return apiError(fallback, 500, "INTERNAL_ERROR");
  }

  logger.error("Unhandled non-error API failure", { error: String(error), fallback });
  return apiError(fallback, 500, "INTERNAL_ERROR");
}
