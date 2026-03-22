import crypto from "node:crypto";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";

export function getSessionTokenFromRequest(request: NextRequest) {
  return (
    request.cookies.get("next-auth.session-token")?.value ??
    request.cookies.get("__Secure-next-auth.session-token")?.value ??
    null
  );
}

export function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null
  );
}

export async function getRequestId() {
  const headerStore = await headers();
  return headerStore.get("x-request-id") ?? crypto.randomUUID();
}
