import { type NextRequest, NextResponse } from "next/server";

function configuredContentOrigin(): string {
  const value = process.env.CONTENT_ORIGIN ?? "http://localhost:3101";
  const url = new URL(value);
  if (
    !/^https?:$/.test(url.protocol) ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("CONTENT_ORIGIN must be an exact HTTP(S) origin");
  }
  return url.origin;
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID(), "utf8").toString("base64");
  const contentOrigin = configuredContentOrigin();
  const developmentScriptSource =
    process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
  const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'none'",
    "connect-src 'self'",
    "font-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `frame-src ${contentOrigin}`,
    "img-src 'self' data:",
    "media-src 'none'",
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${developmentScriptSource}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "worker-src 'none'",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  if (request.nextUrl.pathname.startsWith("/m0/isolation-proof")) {
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

export const config = {
  matcher: [
    {
      missing: [
        { key: "next-router-prefetch", type: "header" },
        { key: "purpose", type: "header", value: "prefetch" },
      ],
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
    },
  ],
};
