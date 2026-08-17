import { expect, test, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";

const appOrigin = "http://127.0.0.1:3100";
const contentOrigin = "http://localhost:3101";
const contentListenOrigin = "http://[::1]:3101";
const unsafeAppHostGatewayAlias = "http://127.0.0.1:3101";
const publicTtlMilliseconds = 3_000;
const previewTtlMilliseconds = 5_000;

type IssuedCapability = {
  artifactUrl: string;
  audience: "preview" | "public";
  expiresAt: number;
  outputId: string;
  renderRevisionId: string;
};

function proofId(projectName: string, label: string): string {
  return `${projectName}-${label}-${randomUUID()}`
    .replaceAll("-", "_")
    .slice(0, 64);
}

async function issuePublicCapability(
  request: APIRequestContext,
  id: string,
  outputId = "hostile-html",
) {
  return request.post("/api/m0/capabilities", {
    data: { audience: "public", outputId, proofId: id },
  });
}

test.describe.configure({ mode: "serial" });

test("strict nonce CSP protects an app-owned shell and confines hostile frames", async ({
  context,
  page,
  request,
}, testInfo) => {
  const id = proofId(testInfo.project.name, "boundary");
  await context.addCookies([
    {
      name: "m0_app_session",
      url: appOrigin,
      value: "must-not-reach-content-origin",
    },
  ]);
  await expect(
    request.get(`${unsafeAppHostGatewayAlias}/health`, { timeout: 1_000 }),
  ).rejects.toThrow();
  const gatewayHealth = await request.get(`${contentListenOrigin}/health`);
  expect(gatewayHealth.status()).toBe(204);
  expect(gatewayHealth.headers()["x-m0-gateway-environment"]).toBe(
    "strict-allowlist",
  );
  const canaryResponses: string[] = [];
  page.on("response", (browserResponse) => {
    if (browserResponse.url().startsWith(`${contentOrigin}/canary/`)) {
      canaryResponses.push(browserResponse.url());
    }
  });
  const dialogs: string[] = [];
  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.dismiss();
  });

  const hostileHtmlResponsePromise = page.waitForResponse(
    (response) => response.headers()["x-m0-output-id"] === "hostile-html",
  );
  const hostileSvgResponsePromise = page.waitForResponse(
    (response) => response.headers()["x-m0-output-id"] === "hostile-svg",
  );
  const navigation = await page.goto(`/m0/isolation-proof?proof=${id}`);
  expect(navigation?.ok()).toBe(true);
  const csp = navigation?.headers()["content-security-policy"] ?? "";
  expect(csp).not.toContain("'unsafe-inline'");
  expect(csp).not.toContain("'unsafe-eval'");
  expect(csp).toContain(`frame-src ${contentOrigin}`);
  const nonce = csp.match(/script-src 'self' 'nonce-([^']+)'/)?.[1];
  expect(nonce).toBeTruthy();

  const secondResponse = await request.get(`/m0/isolation-proof?proof=${id}`);
  const secondNonce = secondResponse
    .headers()
    ["content-security-policy"]?.match(
      /script-src 'self' 'nonce-([^']+)'/,
    )?.[1];
  expect(secondNonce).toBeTruthy();
  expect(secondNonce).not.toBe(nonce);

  const executableScriptNonces = await page
    .locator("script")
    .evaluateAll((scripts) =>
      scripts
        .filter((script) => {
          const type = script.getAttribute("type");
          return (
            type === null || type === "module" || type === "text/javascript"
          );
        })
        .map((script) => (script as HTMLScriptElement).nonce),
    );
  expect(executableScriptNonces.length).toBeGreaterThan(0);
  expect(
    executableScriptNonces.every((scriptNonce) => scriptNonce === nonce),
  ).toBe(true);

  await page.evaluate(() => {
    localStorage.setItem("callysto-app-secret", "app-local-value");
    sessionStorage.setItem("callysto-app-secret", "app-session-value");
  });
  await expect(page.locator("#cell-proof-code-cell img")).toHaveCount(0);
  await expect(page.locator("#cell-proof-code-cell code")).toContainText(
    "<img src=x onerror=",
  );
  await expect(page.locator('[data-output-id="hostile-html"]')).toHaveAttribute(
    "data-output-status",
    "ready",
  );
  await expect(page.locator('[data-output-id="hostile-svg"]')).toHaveAttribute(
    "data-output-status",
    "ready",
  );

  const htmlFrameElement = page.getByTestId("isolated-frame-hostile-html");
  const svgFrameElement = page.getByTestId("isolated-frame-hostile-svg");
  for (const frameElement of [htmlFrameElement, svgFrameElement]) {
    await expect(frameElement).toHaveAttribute("sandbox", "");
    await expect(frameElement).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(await frameElement.getAttribute("src")).toMatch(
      /^http:\/\/localhost:3101\/v0\/outputs\/(?:hostile-html|hostile-svg)\?cap=/,
    );
  }

  const htmlResponse = await hostileHtmlResponsePromise;
  const svgResponse = await hostileSvgResponsePromise;
  for (const response of [htmlResponse, svgResponse]) {
    const headers = response.headers();
    expect(headers["cache-control"]).toBe("private, no-store");
    expect(headers["content-security-policy"]).toContain("default-src 'none'");
    expect(headers["content-security-policy"]).toContain("script-src 'none'");
    expect(headers["content-security-policy"]).toContain("connect-src 'none'");
    expect(headers["content-security-policy"]).toContain("frame-src 'none'");
    expect(headers["content-security-policy"]).toContain("worker-src 'none'");
    expect(headers["content-security-policy"]).toContain(
      `frame-ancestors ${appOrigin}`,
    );
    expect(headers["permissions-policy"]).toBe(
      "camera=(), geolocation=(), microphone=()",
    );
    expect(headers["referrer-policy"]).toBe("no-referrer");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-m0-received-cookie"]).toBe("absent");
    expect(headers["x-m0-gateway-environment"]).toBe("strict-allowlist");
    expect(headers["access-control-allow-origin"]).toBeUndefined();
    expect(headers["set-cookie"]).toBeUndefined();
  }
  expect(htmlResponse.headers()["content-type"]).toBe(
    "text/html; charset=utf-8",
  );
  expect(svgResponse.headers()["content-type"]).toBe("image/svg+xml");

  const htmlFrame = page.frameLocator(
    '[data-testid="isolated-frame-hostile-html"]',
  );
  const svgFrame = page.frameLocator(
    '[data-testid="isolated-frame-hostile-svg"]',
  );
  await expect(htmlFrame.locator("body")).toHaveAttribute(
    "data-script-ran",
    "no",
  );
  await expect(htmlFrame.locator("body")).not.toHaveAttribute(
    "data-event-handler-ran",
    "yes",
  );
  await expect(svgFrame.locator("svg")).not.toHaveAttribute(
    "data-script-ran",
    "yes",
  );
  await expect(svgFrame.locator("svg")).not.toHaveAttribute(
    "data-event-handler-ran",
    "yes",
  );

  const isolatedFrame = page
    .frames()
    .find((frame) =>
      frame.url().startsWith(`${contentOrigin}/v0/outputs/hostile-html`),
    );
  expect(isolatedFrame).toBeTruthy();
  const storageResult = await isolatedFrame?.evaluate(() => {
    try {
      return localStorage.getItem("callysto-app-secret") ?? "readable-empty";
    } catch {
      return "opaque-origin-blocked";
    }
  });
  expect(storageResult).toBe("opaque-origin-blocked");

  await htmlFrame.locator("#hostile-form-submit").click();
  await htmlFrame.locator("#hostile-top-navigation").click();
  await htmlFrame.locator("#hostile-popup").click();
  await page.waitForTimeout(250);
  expect(page.url()).toBe(`${appOrigin}/m0/isolation-proof?proof=${id}`);
  expect(context.pages()).toHaveLength(1);
  expect(dialogs).toEqual([]);
  expect(canaryResponses).toEqual([]);
});

test("capabilities bind audience and output, expire, and fail closed after tampering", async ({
  request,
}, testInfo) => {
  const id = proofId(testInfo.project.name, "capability");
  const issuedResponse = await issuePublicCapability(request, id);
  expect(issuedResponse.ok()).toBe(true);
  expect(issuedResponse.headers()["cache-control"]).toBe("private, no-store");
  const issued = (await issuedResponse.json()) as IssuedCapability;
  expect(issued.audience).toBe("public");
  expect(issued.outputId).toBe("hostile-html");
  expect(issued.expiresAt - Date.now()).toBeGreaterThan(0);
  expect(issued.expiresAt - Date.now()).toBeLessThanOrEqual(
    publicTtlMilliseconds,
  );

  const artifactResponse = await request.get(issued.artifactUrl);
  expect(artifactResponse.ok()).toBe(true);
  expect(artifactResponse.headers()["cache-control"]).toBe("private, no-store");
  expect(artifactResponse.headers()["x-m0-capability-audience"]).toBe("public");

  const artifactUrl = new URL(issued.artifactUrl);
  const token = artifactUrl.searchParams.get("cap");
  expect(token).toBeTruthy();
  const tokenParts = token?.split(".") ?? [];
  const signature = tokenParts[2] ?? "";
  const tamperedSignature = `${signature.startsWith("A") ? "B" : "A"}${signature.slice(1)}`;
  const tamperedToken = `${tokenParts[0]}.${tokenParts[1]}.${tamperedSignature}`;
  artifactUrl.searchParams.set("cap", tamperedToken ?? "invalid");
  const tamperedResponse = await request.get(artifactUrl.toString());
  expect(tamperedResponse.status()).toBe(401);
  expect(tamperedResponse.headers()["cache-control"]).toBe("private, no-store");

  const unknownOutput = await issuePublicCapability(
    request,
    id,
    "../accepted/original",
  );
  expect(unknownOutput.status()).toBe(400);

  const wrongPreview = await request.post("/api/m0/capabilities", {
    data: {
      audience: "preview",
      draftGeneration: 8,
      draftId: "draft-m0-isolation",
      outputId: "hostile-html",
      proofId: id,
    },
  });
  expect(wrongPreview.status()).toBe(409);
  const previewResponse = await request.post("/api/m0/capabilities", {
    data: {
      audience: "preview",
      draftGeneration: 7,
      draftId: "draft-m0-isolation",
      outputId: "hostile-html",
      proofId: id,
    },
  });
  expect(previewResponse.ok()).toBe(true);
  const preview = (await previewResponse.json()) as IssuedCapability;
  expect(preview.audience).toBe("preview");
  expect(preview.expiresAt - Date.now()).toBeGreaterThan(0);
  expect(preview.expiresAt - Date.now()).toBeLessThanOrEqual(
    previewTtlMilliseconds,
  );
  const previewArtifact = await request.get(preview.artifactUrl);
  expect(previewArtifact.ok()).toBe(true);
  expect(previewArtifact.headers()["x-m0-capability-audience"]).toBe("preview");

  await new Promise((resolve) =>
    setTimeout(resolve, publicTtlMilliseconds + 150),
  );
  const expiredResponse = await request.get(issued.artifactUrl);
  expect(expiredResponse.status()).toBe(401);
  expect(expiredResponse.headers()["cache-control"]).toBe("private, no-store");
});

test("a later output obtains a fresh capability after the first lifetime", async ({
  page,
}, testInfo) => {
  const id = proofId(testInfo.project.name, "lazy");
  const issuanceTimes: number[] = [];
  page.on("response", (response) => {
    if (
      response.url().endsWith("/api/m0/capabilities") &&
      response.request().postData()?.includes('"outputId":"later-html"')
    ) {
      issuanceTimes.push(Date.now());
    }
  });
  await page.goto(`/m0/isolation-proof?proof=${id}`);
  await expect(page.locator('[data-output-id="hostile-html"]')).toHaveAttribute(
    "data-output-status",
    "ready",
  );
  await expect(page.locator('[data-output-id="later-html"]')).toHaveAttribute(
    "data-output-status",
    "idle",
  );

  await page.waitForTimeout(publicTtlMilliseconds + 150);
  await page.locator("#cell-proof-later-cell").scrollIntoViewIfNeeded();
  await expect(page.locator('[data-output-id="later-html"]')).toHaveAttribute(
    "data-output-status",
    "ready",
  );
  await expect(
    page
      .frameLocator('[data-testid="isolated-frame-later-html"]')
      .getByRole("heading"),
  ).toHaveText("Later output loaded on demand");
  expect(issuanceTimes).toHaveLength(1);
});

test("restriction replaces a rendered frame and restoration requires a new capability", async ({
  page,
  request,
}, testInfo) => {
  const id = proofId(testInfo.project.name, "restriction");
  await page.goto(`/m0/isolation-proof?proof=${id}`);
  const output = page.locator('[data-output-id="hostile-html"]');
  const frame = page.getByTestId("isolated-frame-hostile-html");
  await expect(output).toHaveAttribute("data-output-status", "ready");
  const issuedArtifactUrl = await frame.getAttribute("src");
  expect(issuedArtifactUrl).toBeTruthy();

  const restrictResponse = await request.post("/api/m0/restrictions", {
    data: { proofId: id, restricted: true },
  });
  expect(restrictResponse.ok()).toBe(true);
  const deniedIssuance = await issuePublicCapability(request, id);
  expect(deniedIssuance.status()).toBe(410);
  expect(await deniedIssuance.json()).toMatchObject({
    code: "RENDER_RESTRICTED",
  });

  const stillWithinBound = await request.get(issuedArtifactUrl!);
  expect(stillWithinBound.ok()).toBe(true);
  await expect(output).toHaveAttribute("data-output-status", "unavailable", {
    timeout: publicTtlMilliseconds + 2_000,
  });
  await expect(frame).toHaveCount(0);
  await expect(output).toContainText(
    "Output unavailable because this proof render is restricted.",
  );
  await expect
    .poll(async () => (await request.get(issuedArtifactUrl!)).status(), {
      timeout: publicTtlMilliseconds + 2_000,
    })
    .toBe(401);

  const restoreResponse = await request.post("/api/m0/restrictions", {
    data: { proofId: id, restricted: false },
  });
  expect(restoreResponse.ok()).toBe(true);
  await output.getByRole("button", { name: "Check output again" }).click();
  await expect(output).toHaveAttribute("data-output-status", "ready");
  const restoredArtifactUrl = await frame.getAttribute("src");
  expect(restoredArtifactUrl).toBeTruthy();
  expect(restoredArtifactUrl).not.toBe(issuedArtifactUrl);
});
