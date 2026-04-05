import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const SUPPORTED_LOCALES = ["pt-MZ", "pt-BR", "en"] as const;
const DEFAULT_LOCALE = "pt-MZ";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const API_CSRF_EXEMPTIONS = [
  "/api/payments/callback/",
  "/api/internal/workers/run",
  "/api/health",
];
const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/offline",
]);
const PUBLIC_PREFIXES = [
  "/api/auth",
  "/api/demo",
  "/api/health",
  "/api/payments/callback",
  "/_next",
  "/favicon.ico",
];
const COOKIE_AUTH_EXEMPTIONS = ["/api/internal/workers/run"];

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

function applyResponseMetadata(
  request: NextRequest,
  response: NextResponse,
  requestId: string,
) {
  response.headers.set("x-request-id", requestId);

  const existingLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (existingLocale && SUPPORTED_LOCALES.includes(existingLocale as (typeof SUPPORTED_LOCALES)[number])) {
    response.headers.set("x-locale", existingLocale);
    return response;
  }

  response.headers.set("x-locale", DEFAULT_LOCALE);
  response.cookies.set("NEXT_LOCALE", DEFAULT_LOCALE, {
    path: "/",
    maxAge: 31536000,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const requestId = requestHeaders.get("x-request-id") ?? crypto.randomUUID();
  requestHeaders.set("x-request-id", requestId);

  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith("/api/");
  const isCsrfExempt = API_CSRF_EXEMPTIONS.some((prefix) => pathname.startsWith(prefix));
  const isCookieAuthExempt = COOKIE_AUTH_EXEMPTIONS.some((prefix) => pathname.startsWith(prefix));
  const isPublicPath =
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const isProtectedSurface = pathname.startsWith("/app") || pathname.startsWith("/api/");

  if (isApiRoute && !SAFE_METHODS.has(request.method) && !isCsrfExempt && !isSameOriginRequest(request)) {
    return applyResponseMetadata(
      request,
      NextResponse.json(
      { error: "Origem inválida", code: "CSRF_BLOCKED" },
      {
        status: 403,
      },
      ),
      requestId,
    );
  }

  const token = isPublicPath || isCookieAuthExempt
    ? null
    : await getToken({
        req: request,
        secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
      });

  if (!isPublicPath && !isCookieAuthExempt && isProtectedSurface && !token?.sub) {
    if (isApiRoute) {
      return applyResponseMetadata(
        request,
        NextResponse.json({ error: "Não autorizado" }, { status: 401 }),
        requestId,
      );
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search}`);

    return applyResponseMetadata(
      request,
      NextResponse.redirect(loginUrl),
      requestId,
    );
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  return applyResponseMetadata(request, response, requestId);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|logo.svg|sw.js|.*\\..*).*)"],
};
