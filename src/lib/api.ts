import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

export function apiSuccess<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function apiError(
  error: string,
  status = 400,
  code?: string,
  details?: unknown
) {
  return NextResponse.json(
    {
      error,
      code,
      ...(details !== undefined ? { details } : {}),
    },
    { status }
  );
}

export async function parseBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<z.infer<T>> {
  const body = await request.json();
  return schema.parse(body);
}

export function getZodErrorDetails(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export function handleApiError(error: unknown, fallback = "Erro interno do servidor") {
  if (error instanceof ZodError) {
    return apiError("Pedido inválido", 400, "VALIDATION_ERROR", getZodErrorDetails(error));
  }

  if (error instanceof Error) {
    return apiError(error.message || fallback, 400);
  }

  return apiError(fallback, 500);
}
