import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

import {
  CapabilityError,
  verifyContentCapability,
} from "../lib/m0/capability.mts";

const allowedEnvironmentNames = new Set([
  "APP_URL",
  "CONTENT_CAPABILITY_KEY_ID",
  "CONTENT_CAPABILITY_PUBLIC_KEY_PEM",
  "M0_CONTENT_HOST",
  "M0_CONTENT_PORT",
  "M0_GATEWAY_ENVIRONMENT_MODE",
  "M0_PREVIEW_DRAFT_GENERATION",
  "M0_PREVIEW_DRAFT_ID",
  "M0_RENDER_REVISION_ID",
  "__CF_USER_TEXT_ENCODING",
]);
const unexpectedEnvironmentCount = Object.keys(process.env).filter(
  (name) => !allowedEnvironmentNames.has(name),
).length;
if (
  process.env.M0_GATEWAY_ENVIRONMENT_MODE !== "strict-allowlist" ||
  unexpectedEnvironmentCount !== 0
) {
  throw new Error(
    "The M0 content gateway requires an exact environment allowlist",
  );
}

const host = process.env.M0_CONTENT_HOST ?? "::1";
const port = Number(process.env.M0_CONTENT_PORT ?? "3101");
const listenOrigin = `http://${host.includes(":") ? `[${host}]` : host}:${port}`;
const appOrigin = requireOrigin("APP_URL");
const expectedKeyId = requireEnvironment("CONTENT_CAPABILITY_KEY_ID");
const publicKeyPem = requireEnvironment("CONTENT_CAPABILITY_PUBLIC_KEY_PEM");
const expectedRenderRevisionId = requireEnvironment("M0_RENDER_REVISION_ID");
const expectedPreviewDraftId = requireEnvironment("M0_PREVIEW_DRAFT_ID");
const expectedPreviewDraftGeneration = Number(
  requireEnvironment("M0_PREVIEW_DRAFT_GENERATION"),
);

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("M0_CONTENT_PORT must be an unprivileged TCP port");
}
if (
  !Number.isSafeInteger(expectedPreviewDraftGeneration) ||
  expectedPreviewDraftGeneration <= 0
) {
  throw new Error("M0_PREVIEW_DRAFT_GENERATION must be a positive integer");
}

const artifacts = JSON.parse(
  await readFile(
    new URL("../contracts/m0-isolation-proof-artifacts.json", import.meta.url),
    "utf8",
  ),
);
const artifactById = new Map(
  artifacts.map((artifact) => [artifact.id, artifact]),
);

const contentSecurityPolicy = [
  "default-src 'none'",
  "base-uri 'none'",
  "connect-src 'none'",
  "font-src data:",
  "form-action 'none'",
  `frame-ancestors ${appOrigin}`,
  "frame-src 'none'",
  "img-src data: blob:",
  "media-src data: blob:",
  "object-src 'none'",
  "script-src 'none'",
  "style-src 'unsafe-inline'",
  "worker-src 'none'",
].join("; ");

function requireEnvironment(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function requireOrigin(name) {
  const value = requireEnvironment(name);
  const url = new URL(value);
  if (
    !/^https?:$/.test(url.protocol) ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(`${name} must be an exact HTTP(S) origin`);
  }
  return url.origin;
}

function setArtifactHeaders(response, request, contentType) {
  response.setHeader("Cache-Control", "private, no-store");
  response.setHeader("Content-Security-Policy", contentSecurityPolicy);
  response.setHeader("Content-Type", contentType);
  response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  response.setHeader(
    "Permissions-Policy",
    "camera=(), geolocation=(), microphone=()",
  );
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader(
    "X-M0-Received-Cookie",
    request.headers.cookie ? "present" : "absent",
  );
  response.setHeader("X-M0-Gateway-Environment", "strict-allowlist");
}

function sendNeutralError(response, request, status, code) {
  setArtifactHeaders(response, request, "text/html; charset=utf-8");
  response.statusCode = status;
  response.end(
    `<!doctype html><html><body><h1>Content unavailable</h1><p>${code}</p></body></html>`,
  );
}

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? "/", listenOrigin);
  if (request.method === "GET" && requestUrl.pathname === "/health") {
    response.statusCode = 204;
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-M0-Gateway-Environment", "strict-allowlist");
    response.end();
    return;
  }
  if (requestUrl.pathname.startsWith("/canary/")) {
    response.statusCode = 204;
    response.setHeader("Cache-Control", "no-store");
    response.end();
    return;
  }
  if (request.method !== "GET" || requestUrl.pathname !== "/artifact") {
    sendNeutralError(response, request, 404, "ARTIFACT_NOT_FOUND");
    return;
  }

  const token = requestUrl.searchParams.get("cap");
  if (!token) {
    sendNeutralError(response, request, 401, "CAPABILITY_REQUIRED");
    return;
  }
  try {
    const capability = verifyContentCapability({
      expectedPreviewDraftGeneration,
      expectedPreviewDraftId,
      expectedKeyId,
      expectedRenderRevisionId,
      publicKeyPem,
      token,
    });
    const artifact = artifactById.get(capability.outputId);
    if (!artifact) {
      sendNeutralError(response, request, 404, "ARTIFACT_NOT_FOUND");
      return;
    }
    setArtifactHeaders(response, request, artifact.mime);
    response.setHeader("X-M0-Capability-Audience", capability.audience);
    response.setHeader("X-M0-Output-Id", capability.outputId);
    response.statusCode = 200;
    response.end(artifact.body);
  } catch (error) {
    const code =
      error instanceof CapabilityError ? error.code : "CAPABILITY_INVALID";
    sendNeutralError(response, request, 401, code);
  }
});

server.listen(port, host, () => {
  process.stdout.write(`M0 content gateway listening on ${listenOrigin}\n`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
