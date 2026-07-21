import { expect, test } from "@playwright/test";

const exactStaticDirectives = [
  "default-src 'self'",
  "base-uri 'none'",
  "connect-src 'self'",
  "font-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src http://localhost:3101",
  "img-src 'self' data:",
  "media-src 'none'",
  "object-src 'none'",
  "worker-src 'none'",
];

for (const { path, status } of [
  { path: "/", status: 200 },
  { path: "/@demo/example-notebook", status: 200 },
  { path: "/missing-m0-header-check", status: 404 },
]) {
  test(`${path} returns the exact M0 application-header baseline`, async ({
    request,
  }) => {
    const response = await request.get(path);
    const headers = response.headers();

    expect(response.status()).toBe(status);
    const contentSecurityPolicy = headers["content-security-policy"];
    expect(contentSecurityPolicy).toBeTruthy();
    for (const directive of exactStaticDirectives) {
      expect(contentSecurityPolicy).toContain(directive);
    }
    expect(contentSecurityPolicy).toMatch(
      /script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/,
    );
    expect(contentSecurityPolicy).toMatch(
      /style-src 'self' 'nonce-[A-Za-z0-9+/=]+'/,
    );
    expect(contentSecurityPolicy).not.toContain("'unsafe-inline'");
    expect(contentSecurityPolicy).not.toContain("'unsafe-eval'");
    expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
    expect(headers["origin-agent-cluster"]).toBe("?1");
    expect(headers["permissions-policy"]).toBe(
      "camera=(), geolocation=(), microphone=()",
    );
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
  });
}
