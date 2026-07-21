const CAPABILITY_TYPE = "cly-content-capability-v2";
const CONTENT_INDEX_SCHEMA = "callysto.content-index.v0";
const MAXIMUM_TOKEN_LENGTH = 2_048;
const MAXIMUM_INDEX_BYTES = 256 * 1_024;
const MAXIMUM_ARTIFACT_BYTES = 10 * 1_024 * 1_024;
const MAXIMUM_ARTIFACTS_PER_INDEX = 2_000;

const opaqueIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/;
const keyIdPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
const sha256Pattern = /^[0-9a-f]{64}$/;
const contentTypes = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "text/html; charset=utf-8",
]);

type R2ObjectBodyLike = {
  arrayBuffer(): Promise<ArrayBuffer>;
  size: number;
};

export type ReadOnlyR2Binding = {
  get(key: string): Promise<R2ObjectBodyLike | null>;
};

export type ContentGatewayEnvironment = {
  CONTENT_APP_ORIGIN: string;
  CONTENT_ARTIFACT_PREFIX: string;
  CONTENT_ARTIFACTS: ReadOnlyR2Binding;
  CONTENT_CAPABILITY_KEY_ID: string;
  CONTENT_CAPABILITY_PUBLIC_KEY_SPKI_BASE64URL: string;
};

type GatewayConfig = {
  appOrigin: string;
  artifactPrefix: string;
  artifacts: ReadOnlyR2Binding;
  keyId: string;
  verificationKey: CryptoKey;
};

type ContentCapability = {
  audience: "preview" | "public";
  contentIndexSha256: string;
  draftGeneration?: number;
  draftId?: string;
  expiresAt: number;
  issuedAt: number;
  outputId: string;
  proofId: string;
  renderRevisionId: string;
  type: typeof CAPABILITY_TYPE;
};

type ArtifactDescriptor = {
  byteSize: number;
  contentType: string;
  outputId: string;
  sha256: string;
};

class GatewayFailure extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
    this.name = "GatewayFailure";
  }
}

function exactKeys(
  value: Record<string, unknown>,
  expected: string[],
): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index])
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new GatewayFailure("ARTIFACT_UNAVAILABLE", 503);
  }
  return value as Record<string, unknown>;
}

function asCapabilityRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new GatewayFailure("CAPABILITY_INVALID", 401);
  }
  return value as Record<string, unknown>;
}

function decodeBase64Url(value: string, maximumBytes: number): Uint8Array {
  if (!value || !base64UrlPattern.test(value)) {
    throw new GatewayFailure("CAPABILITY_INVALID", 401);
  }
  try {
    const paddingLength = (4 - (value.length % 4)) % 4;
    const binary = atob(
      `${value.replaceAll("-", "+").replaceAll("_", "/")}${"=".repeat(
        paddingLength,
      )}`,
    );
    if (binary.length > maximumBytes) {
      throw new Error("decoded input exceeds its bound");
    }
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );
    if (encodeBase64Url(bytes) !== value) {
      throw new Error("base64url is not canonical");
    }
    return bytes;
  } catch {
    throw new GatewayFailure("CAPABILITY_INVALID", 401);
  }
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function exactArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

function decodeCanonicalJson(segment: string): unknown {
  try {
    const bytes = decodeBase64Url(segment, MAXIMUM_TOKEN_LENGTH);
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const parsed = JSON.parse(text) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      JSON.stringify(parsed) !== text
    ) {
      throw new Error("JSON is not canonical");
    }
    return parsed;
  } catch (error) {
    if (error instanceof GatewayFailure) throw error;
    throw new GatewayFailure("CAPABILITY_INVALID", 401);
  }
}

function assertOpaqueId(value: unknown): asserts value is string {
  if (typeof value !== "string" || !opaqueIdPattern.test(value)) {
    throw new GatewayFailure("CAPABILITY_INVALID", 401);
  }
}

function parseCapabilityPayload(value: unknown): ContentCapability {
  const payload = asCapabilityRecord(value);
  assertOpaqueId(payload.proofId);
  assertOpaqueId(payload.outputId);
  assertOpaqueId(payload.renderRevisionId);
  if (
    typeof payload.contentIndexSha256 !== "string" ||
    !sha256Pattern.test(payload.contentIndexSha256)
  ) {
    throw new GatewayFailure("CAPABILITY_INVALID", 401);
  }
  if (payload.audience !== "public" && payload.audience !== "preview") {
    throw new GatewayFailure("CAPABILITY_INVALID", 401);
  }
  if (
    !Number.isSafeInteger(payload.issuedAt) ||
    !Number.isSafeInteger(payload.expiresAt) ||
    Number(payload.expiresAt) <= Number(payload.issuedAt) ||
    payload.type !== CAPABILITY_TYPE
  ) {
    throw new GatewayFailure("CAPABILITY_INVALID", 401);
  }
  if (payload.audience === "preview") {
    if (
      !exactKeys(payload, [
        "audience",
        "contentIndexSha256",
        "draftGeneration",
        "draftId",
        "expiresAt",
        "issuedAt",
        "outputId",
        "proofId",
        "renderRevisionId",
        "type",
      ]) ||
      !Number.isSafeInteger(payload.draftGeneration) ||
      Number(payload.draftGeneration) <= 0
    ) {
      throw new GatewayFailure("CAPABILITY_INVALID", 401);
    }
    assertOpaqueId(payload.draftId);
  } else if (
    !exactKeys(payload, [
      "audience",
      "contentIndexSha256",
      "expiresAt",
      "issuedAt",
      "outputId",
      "proofId",
      "renderRevisionId",
      "type",
    ])
  ) {
    throw new GatewayFailure("CAPABILITY_INVALID", 401);
  }
  return payload as ContentCapability;
}

async function verifyCapability({
  config,
  now,
  outputId,
  token,
}: {
  config: GatewayConfig;
  now: number;
  outputId: string;
  token: string;
}): Promise<ContentCapability> {
  if (token.length > MAXIMUM_TOKEN_LENGTH) {
    throw new GatewayFailure("CAPABILITY_INVALID", 401);
  }
  const segments = token.split(".");
  if (segments.length !== 3 || segments.some((segment) => !segment)) {
    throw new GatewayFailure("CAPABILITY_INVALID", 401);
  }
  const [headerSegment, payloadSegment, signatureSegment] = segments;
  const header = asCapabilityRecord(decodeCanonicalJson(headerSegment));
  if (
    !exactKeys(header, ["algorithm", "keyId", "type"]) ||
    header.algorithm !== "Ed25519" ||
    header.keyId !== config.keyId ||
    header.type !== CAPABILITY_TYPE
  ) {
    throw new GatewayFailure("CAPABILITY_INVALID", 401);
  }
  const signature = decodeBase64Url(signatureSegment, 64);
  if (signature.byteLength !== 64) {
    throw new GatewayFailure("CAPABILITY_INVALID", 401);
  }
  let signatureValid = false;
  try {
    signatureValid = await crypto.subtle.verify(
      { name: "Ed25519" },
      config.verificationKey,
      exactArrayBuffer(signature),
      new TextEncoder().encode(`${headerSegment}.${payloadSegment}`),
    );
  } catch {
    throw new GatewayFailure("CAPABILITY_INVALID", 401);
  }
  if (!signatureValid) {
    throw new GatewayFailure("CAPABILITY_INVALID", 401);
  }
  const payload = parseCapabilityPayload(decodeCanonicalJson(payloadSegment));
  const nowSeconds = Math.floor(now / 1_000);
  const maximumTtl = payload.audience === "public" ? 60 : 300;
  if (
    nowSeconds >= payload.expiresAt ||
    payload.issuedAt > nowSeconds + 5 ||
    payload.expiresAt - payload.issuedAt > maximumTtl ||
    payload.expiresAt > nowSeconds + maximumTtl ||
    payload.outputId !== outputId
  ) {
    throw new GatewayFailure("CAPABILITY_INVALID", 401);
  }
  return payload;
}

function requireString(
  environment: Record<string, unknown>,
  name: string,
): string {
  const value = environment[name];
  if (typeof value !== "string" || !value || value.trim() !== value) {
    throw new GatewayFailure("GATEWAY_CONFIGURATION_INVALID", 503);
  }
  return value;
}

async function parseConfig(
  environment: ContentGatewayEnvironment,
): Promise<GatewayConfig> {
  const values = environment as unknown as Record<string, unknown>;
  const appOriginValue = requireString(values, "CONTENT_APP_ORIGIN");
  let appOrigin: string;
  try {
    const parsed = new URL(appOriginValue);
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash ||
      parsed.origin !== appOriginValue
    ) {
      throw new Error("not an exact HTTPS origin");
    }
    appOrigin = parsed.origin;
  } catch {
    throw new GatewayFailure("GATEWAY_CONFIGURATION_INVALID", 503);
  }

  const artifactPrefix = requireString(values, "CONTENT_ARTIFACT_PREFIX");
  if (
    artifactPrefix.length > 128 ||
    !/^[a-z0-9][a-z0-9_/-]*\/$/u.test(artifactPrefix) ||
    artifactPrefix.includes("..") ||
    artifactPrefix.includes("//")
  ) {
    throw new GatewayFailure("GATEWAY_CONFIGURATION_INVALID", 503);
  }

  const keyId = requireString(values, "CONTENT_CAPABILITY_KEY_ID");
  if (!keyIdPattern.test(keyId)) {
    throw new GatewayFailure("GATEWAY_CONFIGURATION_INVALID", 503);
  }
  const publicKeyValue = requireString(
    values,
    "CONTENT_CAPABILITY_PUBLIC_KEY_SPKI_BASE64URL",
  );
  let verificationKey: CryptoKey;
  try {
    const publicKeySpki = decodeBase64Url(publicKeyValue, 256);
    verificationKey = await crypto.subtle.importKey(
      "spki",
      exactArrayBuffer(publicKeySpki),
      { name: "Ed25519" },
      false,
      ["verify"],
    );
  } catch {
    throw new GatewayFailure("GATEWAY_CONFIGURATION_INVALID", 503);
  }
  const artifacts = values.CONTENT_ARTIFACTS;
  if (
    typeof artifacts !== "object" ||
    artifacts === null ||
    typeof (artifacts as { get?: unknown }).get !== "function"
  ) {
    throw new GatewayFailure("GATEWAY_CONFIGURATION_INVALID", 503);
  }
  return {
    appOrigin,
    artifactPrefix,
    artifacts: artifacts as ReadOnlyR2Binding,
    keyId,
    verificationKey,
  };
}

function parseContentIndex(
  value: unknown,
  expectedRenderRevisionId: string,
): Map<string, ArtifactDescriptor> {
  const index = asRecord(value);
  if (
    !exactKeys(index, ["artifacts", "render_revision_id", "schema_version"]) ||
    index.schema_version !== CONTENT_INDEX_SCHEMA ||
    index.render_revision_id !== expectedRenderRevisionId ||
    !Array.isArray(index.artifacts) ||
    index.artifacts.length > MAXIMUM_ARTIFACTS_PER_INDEX
  ) {
    throw new GatewayFailure("ARTIFACT_UNAVAILABLE", 503);
  }
  const artifacts = new Map<string, ArtifactDescriptor>();
  for (const candidate of index.artifacts) {
    const artifact = asRecord(candidate);
    if (
      !exactKeys(artifact, ["byte_size", "content_type", "output_id", "sha256"])
    ) {
      throw new GatewayFailure("ARTIFACT_UNAVAILABLE", 503);
    }
    if (
      typeof artifact.output_id !== "string" ||
      !opaqueIdPattern.test(artifact.output_id) ||
      typeof artifact.content_type !== "string" ||
      !contentTypes.has(artifact.content_type) ||
      typeof artifact.sha256 !== "string" ||
      !sha256Pattern.test(artifact.sha256) ||
      !Number.isSafeInteger(artifact.byte_size) ||
      Number(artifact.byte_size) <= 0 ||
      Number(artifact.byte_size) > MAXIMUM_ARTIFACT_BYTES ||
      artifacts.has(artifact.output_id)
    ) {
      throw new GatewayFailure("ARTIFACT_UNAVAILABLE", 503);
    }
    artifacts.set(artifact.output_id, {
      byteSize: Number(artifact.byte_size),
      contentType: artifact.content_type,
      outputId: artifact.output_id,
      sha256: artifact.sha256,
    });
  }
  return artifacts;
}

async function readContentIndex(
  config: GatewayConfig,
  renderRevisionId: string,
  contentIndexSha256: string,
): Promise<Map<string, ArtifactDescriptor>> {
  const object = await config.artifacts.get(
    `${config.artifactPrefix}manifests/${renderRevisionId}/${contentIndexSha256}.json`,
  );
  if (!object) throw new GatewayFailure("ARTIFACT_NOT_FOUND", 404);
  if (
    !Number.isSafeInteger(object.size) ||
    object.size <= 0 ||
    object.size > MAXIMUM_INDEX_BYTES
  ) {
    throw new GatewayFailure("ARTIFACT_UNAVAILABLE", 503);
  }
  const bytes = await object.arrayBuffer();
  if (bytes.byteLength !== object.size) {
    throw new GatewayFailure("ARTIFACT_UNAVAILABLE", 503);
  }
  if ((await sha256Hex(bytes)) !== contentIndexSha256) {
    throw new GatewayFailure("ARTIFACT_UNAVAILABLE", 503);
  }
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const canonicalText = text.endsWith("\n") ? text.slice(0, -1) : text;
    const parsed = JSON.parse(canonicalText) as unknown;
    if (!canonicalText || JSON.stringify(parsed) !== canonicalText) {
      throw new GatewayFailure("ARTIFACT_UNAVAILABLE", 503);
    }
    return parseContentIndex(parsed, renderRevisionId);
  } catch (error) {
    if (error instanceof GatewayFailure) throw error;
    throw new GatewayFailure("ARTIFACT_UNAVAILABLE", 503);
  }
}

async function readVerifiedArtifact(
  config: GatewayConfig,
  renderRevisionId: string,
  descriptor: ArtifactDescriptor,
): Promise<ArrayBuffer> {
  const object = await config.artifacts.get(
    `${config.artifactPrefix}outputs/${renderRevisionId}/${descriptor.outputId}/${descriptor.sha256}`,
  );
  if (!object) throw new GatewayFailure("ARTIFACT_NOT_FOUND", 404);
  if (
    object.size !== descriptor.byteSize ||
    object.size <= 0 ||
    object.size > MAXIMUM_ARTIFACT_BYTES
  ) {
    throw new GatewayFailure("ARTIFACT_UNAVAILABLE", 503);
  }
  const body = await object.arrayBuffer();
  if (body.byteLength !== descriptor.byteSize) {
    throw new GatewayFailure("ARTIFACT_UNAVAILABLE", 503);
  }
  if ((await sha256Hex(body)) !== descriptor.sha256) {
    throw new GatewayFailure("ARTIFACT_UNAVAILABLE", 503);
  }
  return body;
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function contentHeaders(
  appOrigin: string | null,
  contentType: string,
): Headers {
  const frameAncestor = appOrigin ?? "'none'";
  return new Headers({
    "Cache-Control": "private, no-store",
    "Content-Security-Policy": [
      "default-src 'none'",
      "base-uri 'none'",
      "connect-src 'none'",
      "font-src data:",
      "form-action 'none'",
      `frame-ancestors ${frameAncestor}`,
      "frame-src 'none'",
      "img-src data: blob:",
      "media-src data: blob:",
      "object-src 'none'",
      "script-src 'none'",
      "style-src 'unsafe-inline'",
      "worker-src 'none'",
    ].join("; "),
    "Content-Type": contentType,
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Permissions-Policy":
      "accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });
}

function neutralResponse(
  appOrigin: string | null,
  code: string,
  status: number,
): Response {
  return new Response(
    `<!doctype html><html><body><h1>Content unavailable</h1><p>${code}</p></body></html>`,
    {
      headers: contentHeaders(appOrigin, "text/html; charset=utf-8"),
      status,
    },
  );
}

async function handleRequest(
  request: Request,
  environment: ContentGatewayEnvironment,
  now: () => number,
): Promise<Response> {
  let config: GatewayConfig | null = null;
  try {
    config = await parseConfig(environment);
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return new Response(null, {
        headers: new Headers({ "Cache-Control": "no-store" }),
        status: 204,
      });
    }
    if (request.method !== "GET") {
      const response = neutralResponse(
        config.appOrigin,
        "METHOD_NOT_ALLOWED",
        405,
      );
      response.headers.set("Allow", "GET");
      return response;
    }
    const pathMatch = /^\/v0\/outputs\/([A-Za-z0-9][A-Za-z0-9_-]{0,95})$/u.exec(
      url.pathname,
    );
    if (!pathMatch) {
      return neutralResponse(config.appOrigin, "ARTIFACT_NOT_FOUND", 404);
    }
    if (request.headers.has("Cookie")) {
      return neutralResponse(config.appOrigin, "COOKIE_NOT_ACCEPTED", 400);
    }
    const capabilities = url.searchParams.getAll("cap");
    if (
      capabilities.length !== 1 ||
      [...url.searchParams.keys()].length !== 1
    ) {
      throw new GatewayFailure("CAPABILITY_REQUIRED", 401);
    }
    const outputId = pathMatch[1];
    const capability = await verifyCapability({
      config,
      now: now(),
      outputId,
      token: capabilities[0],
    });
    const index = await readContentIndex(
      config,
      capability.renderRevisionId,
      capability.contentIndexSha256,
    );
    const descriptor = index.get(capability.outputId);
    if (!descriptor) {
      throw new GatewayFailure("ARTIFACT_NOT_FOUND", 404);
    }
    const body = await readVerifiedArtifact(
      config,
      capability.renderRevisionId,
      descriptor,
    );
    return new Response(body, {
      headers: contentHeaders(config.appOrigin, descriptor.contentType),
      status: 200,
    });
  } catch (error) {
    if (error instanceof GatewayFailure) {
      return neutralResponse(
        config?.appOrigin ?? null,
        error.code,
        error.status,
      );
    }
    return neutralResponse(
      config?.appOrigin ?? null,
      "ARTIFACT_UNAVAILABLE",
      503,
    );
  }
}

export function createContentGateway({
  now = Date.now,
}: {
  now?: () => number;
} = {}): {
  fetch(
    request: Request,
    environment: ContentGatewayEnvironment,
  ): Promise<Response>;
} {
  return {
    fetch: (request, environment) => handleRequest(request, environment, now),
  };
}

export default createContentGateway();
