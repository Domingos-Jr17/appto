import { NextRequest, NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const API_CSRF_EXEMPTIONS = [
  "/api/payments/callback/",
  "/api/internal/workers/run",
  "/api/health",
];

function isSameOriginRequest(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return false;
  }

  try {
    const originUrl = new URL(origin);
    return originUrl.host === request.headers.get("host");
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const requestId = requestHeaders.get("x-request-id") ?? crypto.randomUUID();
  requestHeaders.set("x-request-id", requestId);

  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith("/api/");
  const isCsrfExempt = API_CSRF_EXEMPTIONS.some((prefix) => pathname.startsWith(prefix));

  if (isApiRoute && !SAFE_METHODS.has(request.method) && !isCsrfExempt && !isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "Origem inválida", code: "CSRF_BLOCKED" },
      {
        status: 403,
        headers: { "x-request-id": requestId },
      },
    );
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|logo.svg|sw.js).*)"],
};
