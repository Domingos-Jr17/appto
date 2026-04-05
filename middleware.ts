import { NextRequest, NextResponse } from "next/server";

const SUPPORTED_LOCALES = ["pt-MZ", "pt-BR", "en"] as const;
const DEFAULT_LOCALE = "pt-MZ";

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

  const existingLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (existingLocale && SUPPORTED_LOCALES.includes(existingLocale as (typeof SUPPORTED_LOCALES)[number])) {
    response.headers.set("x-locale", existingLocale);
  } else {
    response.headers.set("x-locale", DEFAULT_LOCALE);
    response.cookies.set("NEXT_LOCALE", DEFAULT_LOCALE, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|logo.svg|sw.js).*)"],
};
