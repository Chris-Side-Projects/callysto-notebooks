import { expect, test } from "@playwright/test";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'none'",
  "connect-src 'self'",
  "font-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "img-src 'self' data:",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
].join("; ");

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
    expect(headers["content-security-policy"]).toBe(contentSecurityPolicy);
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
