import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  CapabilityError,
  verifyContentCapability,
} from "../lib/m0/capability.mts";
import { M0_CONTENT_INDEX_SHA256 } from "../lib/m0/proof-content-index.mts";

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
const proofContentTypes = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "text/html; charset=utf-8",
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

const contentIndexBytes = await readFile(
  new URL(
    "../contracts/m0-isolation-proof-content-index.json",
    import.meta.url,
  ),
);
const artifactFixtureBytes = await readFile(
  new URL("../contracts/m0-isolation-proof-artifacts.json", import.meta.url),
);
const actualContentIndexSha256 = createHash("sha256")
  .update(contentIndexBytes)
  .digest("hex");
if (actualContentIndexSha256 !== M0_CONTENT_INDEX_SHA256) {
  throw new Error("The M0 proof content-index digest is stale");
}
const contentIndex = parseCanonicalJson(contentIndexBytes);
const artifactFixture = JSON.parse(artifactFixtureBytes.toString("utf8"));
const artifactById = validateProofContentIndex(contentIndex, artifactFixture);

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
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(`${name} must be an exact HTTP(S) origin`);
  }
  return url.origin;
}

function exactKeys(value, expected) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index])
  );
}

function parseCanonicalJson(bytes) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const canonicalText = text.endsWith("\n") ? text.slice(0, -1) : text;
  const value = JSON.parse(canonicalText);
  if (!canonicalText || JSON.stringify(value) !== canonicalText) {
    throw new Error("The M0 proof content index is not canonical JSON");
  }
  return value;
}

function validateProofContentIndex(index, fixture) {
  if (
    !exactKeys(index, ["artifacts", "render_revision_id", "schema_version"]) ||
    index.schema_version !== "callysto.content-index.v0" ||
    index.render_revision_id !== expectedRenderRevisionId ||
    !Array.isArray(index.artifacts) ||
    index.artifacts.length > 2_000 ||
    !Array.isArray(fixture) ||
    index.artifacts.length !== fixture.length
  ) {
    throw new Error("The M0 proof content index has an invalid envelope");
  }
  const fixtureById = new Map();
  for (const artifact of fixture) {
    if (
      !exactKeys(artifact, ["body", "id", "mime", "title"]) ||
      typeof artifact.id !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/u.test(artifact.id) ||
      typeof artifact.body !== "string" ||
      !artifact.body ||
      typeof artifact.mime !== "string" ||
      typeof artifact.title !== "string" ||
      fixtureById.has(artifact.id)
    ) {
      throw new Error("The M0 proof artifact fixture is invalid");
    }
    fixtureById.set(artifact.id, artifact);
  }
  const artifactById = new Map();
  for (const descriptor of index.artifacts) {
    if (
      !exactKeys(descriptor, [
        "byte_size",
        "content_type",
        "output_id",
        "sha256",
      ]) ||
      typeof descriptor.output_id !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/u.test(descriptor.output_id) ||
      typeof descriptor.content_type !== "string" ||
      !proofContentTypes.has(descriptor.content_type) ||
      typeof descriptor.sha256 !== "string" ||
      !/^[0-9a-f]{64}$/u.test(descriptor.sha256) ||
      !Number.isSafeInteger(descriptor.byte_size) ||
      descriptor.byte_size <= 0 ||
      descriptor.byte_size > 10 * 1_024 * 1_024 ||
      artifactById.has(descriptor.output_id)
    ) {
      throw new Error("The M0 proof artifact descriptor is invalid");
    }
    const artifact = fixtureById.get(descriptor.output_id);
    if (!artifact) {
      throw new Error("The M0 proof artifact descriptor is unbound");
    }
    const bodyBytes = Buffer.from(artifact.body, "utf8");
    if (
      artifact.mime !== descriptor.content_type ||
      bodyBytes.byteLength !== descriptor.byte_size ||
      createHash("sha256").update(bodyBytes).digest("hex") !== descriptor.sha256
    ) {
      throw new Error("The M0 proof artifact bytes do not match the index");
    }
    artifactById.set(descriptor.output_id, artifact);
  }
  return artifactById;
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
  if (request.method !== "GET") {
    sendNeutralError(response, request, 404, "ARTIFACT_NOT_FOUND");
    return;
  }
  const pathMatch = /^\/v0\/outputs\/([A-Za-z0-9][A-Za-z0-9_-]{0,95})$/u.exec(
    requestUrl.pathname,
  );
  if (!pathMatch) {
    sendNeutralError(response, request, 404, "ARTIFACT_NOT_FOUND");
    return;
  }
  const capabilities = requestUrl.searchParams.getAll("cap");
  if (
    capabilities.length !== 1 ||
    [...requestUrl.searchParams.keys()].length !== 1
  ) {
    sendNeutralError(response, request, 401, "CAPABILITY_REQUIRED");
    return;
  }
  const token = capabilities[0];
  try {
    const capability = verifyContentCapability({
      expectedContentIndexSha256: M0_CONTENT_INDEX_SHA256,
      expectedPreviewDraftGeneration,
      expectedPreviewDraftId,
      expectedKeyId,
      expectedRenderRevisionId,
      publicKeyPem,
      token,
    });
    if (capability.outputId !== pathMatch[1]) {
      sendNeutralError(response, request, 401, "CAPABILITY_INVALID");
      return;
    }
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
