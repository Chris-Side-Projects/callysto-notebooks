import {
  createPrivateKey,
  createPublicKey,
  sign,
  timingSafeEqual,
  verify,
} from "node:crypto";

export const CAPABILITY_TYPE = "cly-content-capability-v1";

export type CapabilityAudience = "preview" | "public";

export type ContentCapability = {
  audience: CapabilityAudience;
  draftGeneration?: number;
  draftId?: string;
  expiresAt: number;
  issuedAt: number;
  outputId: string;
  proofId: string;
  renderRevisionId: string;
  type: typeof CAPABILITY_TYPE;
};

type CapabilityHeader = {
  algorithm: "Ed25519";
  keyId: string;
  type: typeof CAPABILITY_TYPE;
};

const opaqueIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/;
const keyIdPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
const maximumTokenLength = 2_048;
const maximumTtlByAudience = { preview: 300, public: 60 } as const;

export class CapabilityError extends Error {
  readonly code:
    | "CAPABILITY_EXPIRED"
    | "CAPABILITY_INVALID"
    | "CAPABILITY_KEY_INVALID"
    | "CAPABILITY_PAYLOAD_INVALID";

  constructor(
    code:
      | "CAPABILITY_EXPIRED"
      | "CAPABILITY_INVALID"
      | "CAPABILITY_KEY_INVALID"
      | "CAPABILITY_PAYLOAD_INVALID",
    message: string,
  ) {
    super(message);
    this.name = "CapabilityError";
    this.code = code;
  }
}

function encodeJson(value: object): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
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

function decodeJson(value: string): unknown {
  if (!base64UrlPattern.test(value)) {
    throw new CapabilityError(
      "CAPABILITY_INVALID",
      "capability segment is not canonical base64url",
    );
  }
  try {
    const bytes = Buffer.from(value, "base64url");
    if (bytes.toString("base64url") !== value) {
      throw new Error("non-canonical base64url");
    }
    const parsed = JSON.parse(bytes.toString("utf8")) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      encodeJson(parsed) !== value
    ) {
      throw new Error("non-canonical JSON");
    }
    return parsed;
  } catch {
    throw new CapabilityError(
      "CAPABILITY_INVALID",
      "capability segment is not valid base64url JSON",
    );
  }
}

function assertOpaqueId(value: unknown, name: string): asserts value is string {
  if (typeof value !== "string" || !opaqueIdPattern.test(value)) {
    throw new CapabilityError(
      "CAPABILITY_PAYLOAD_INVALID",
      `${name} is not a valid opaque identifier`,
    );
  }
}

function parseHeader(value: unknown, expectedKeyId: string): CapabilityHeader {
  if (
    typeof value !== "object" ||
    value === null ||
    !exactKeys(value as Record<string, unknown>, [
      "algorithm",
      "keyId",
      "type",
    ]) ||
    (value as Record<string, unknown>).algorithm !== "Ed25519" ||
    (value as Record<string, unknown>).keyId !== expectedKeyId ||
    (value as Record<string, unknown>).type !== CAPABILITY_TYPE
  ) {
    throw new CapabilityError(
      "CAPABILITY_KEY_INVALID",
      "capability header does not match the configured key",
    );
  }
  return value as CapabilityHeader;
}

function parsePayload(value: unknown): ContentCapability {
  if (typeof value !== "object" || value === null) {
    throw new CapabilityError(
      "CAPABILITY_PAYLOAD_INVALID",
      "capability payload must be an object",
    );
  }
  const payload = value as Record<string, unknown>;
  assertOpaqueId(payload.proofId, "proofId");
  assertOpaqueId(payload.outputId, "outputId");
  assertOpaqueId(payload.renderRevisionId, "renderRevisionId");
  if (payload.audience !== "public" && payload.audience !== "preview") {
    throw new CapabilityError(
      "CAPABILITY_PAYLOAD_INVALID",
      "capability audience is invalid",
    );
  }
  if (
    !Number.isSafeInteger(payload.issuedAt) ||
    !Number.isSafeInteger(payload.expiresAt) ||
    Number(payload.expiresAt) <= Number(payload.issuedAt)
  ) {
    throw new CapabilityError(
      "CAPABILITY_PAYLOAD_INVALID",
      "capability timestamps are invalid",
    );
  }
  if (payload.type !== CAPABILITY_TYPE) {
    throw new CapabilityError(
      "CAPABILITY_PAYLOAD_INVALID",
      "capability type is invalid",
    );
  }
  if (payload.audience === "preview") {
    if (
      !exactKeys(payload, [
        "audience",
        "draftGeneration",
        "draftId",
        "expiresAt",
        "issuedAt",
        "outputId",
        "proofId",
        "renderRevisionId",
        "type",
      ])
    ) {
      throw new CapabilityError(
        "CAPABILITY_PAYLOAD_INVALID",
        "preview capability fields are invalid",
      );
    }
    assertOpaqueId(payload.draftId, "draftId");
    if (
      !Number.isSafeInteger(payload.draftGeneration) ||
      Number(payload.draftGeneration) <= 0
    ) {
      throw new CapabilityError(
        "CAPABILITY_PAYLOAD_INVALID",
        "preview capability generation is invalid",
      );
    }
  } else {
    if (
      !exactKeys(payload, [
        "audience",
        "expiresAt",
        "issuedAt",
        "outputId",
        "proofId",
        "renderRevisionId",
        "type",
      ])
    ) {
      throw new CapabilityError(
        "CAPABILITY_PAYLOAD_INVALID",
        "public capability fields are invalid",
      );
    }
  }
  return payload as ContentCapability;
}

export function issueContentCapability({
  audience,
  draftGeneration,
  draftId,
  keyId,
  now = Date.now(),
  outputId,
  privateKeyPem,
  proofId,
  renderRevisionId,
  ttlSeconds,
}: {
  audience: CapabilityAudience;
  draftGeneration?: number;
  draftId?: string;
  keyId: string;
  now?: number;
  outputId: string;
  privateKeyPem: string;
  proofId: string;
  renderRevisionId: string;
  ttlSeconds: number;
}): { expiresAt: number; token: string } {
  assertOpaqueId(proofId, "proofId");
  assertOpaqueId(outputId, "outputId");
  assertOpaqueId(renderRevisionId, "renderRevisionId");
  if (!keyIdPattern.test(keyId)) {
    throw new CapabilityError(
      "CAPABILITY_KEY_INVALID",
      "capability key identifier is invalid",
    );
  }
  if (
    !Number.isInteger(ttlSeconds) ||
    ttlSeconds <= 0 ||
    ttlSeconds > maximumTtlByAudience[audience]
  ) {
    throw new CapabilityError(
      "CAPABILITY_PAYLOAD_INVALID",
      "capability lifetime must be a positive integer",
    );
  }
  if (audience === "preview") {
    assertOpaqueId(draftId, "draftId");
    if (!Number.isInteger(draftGeneration) || Number(draftGeneration) <= 0) {
      throw new CapabilityError(
        "CAPABILITY_PAYLOAD_INVALID",
        "preview capability generation is invalid",
      );
    }
  } else if (draftId !== undefined || draftGeneration !== undefined) {
    throw new CapabilityError(
      "CAPABILITY_PAYLOAD_INVALID",
      "public capability cannot contain draft authority",
    );
  }

  const issuedAt = Math.floor(now / 1000);
  const payload: ContentCapability = {
    audience,
    ...(audience === "preview" ? { draftGeneration, draftId } : {}),
    expiresAt: issuedAt + ttlSeconds,
    issuedAt,
    outputId,
    proofId,
    renderRevisionId,
    type: CAPABILITY_TYPE,
  };
  const header: CapabilityHeader = {
    algorithm: "Ed25519",
    keyId,
    type: CAPABILITY_TYPE,
  };
  const signingInput = `${encodeJson(header)}.${encodeJson(payload)}`;
  let signature: Buffer;
  try {
    signature = sign(
      null,
      Buffer.from(signingInput, "ascii"),
      createPrivateKey(privateKeyPem),
    );
  } catch {
    throw new CapabilityError(
      "CAPABILITY_KEY_INVALID",
      "capability private key could not sign",
    );
  }
  return {
    expiresAt: payload.expiresAt,
    token: `${signingInput}.${signature.toString("base64url")}`,
  };
}

export function verifyContentCapability({
  expectedPreviewDraftGeneration,
  expectedPreviewDraftId,
  expectedKeyId,
  expectedRenderRevisionId,
  now = Date.now(),
  publicKeyPem,
  token,
}: {
  expectedPreviewDraftGeneration: number;
  expectedPreviewDraftId: string;
  expectedKeyId: string;
  expectedRenderRevisionId: string;
  now?: number;
  publicKeyPem: string;
  token: string;
}): ContentCapability {
  if (token.length > maximumTokenLength || !keyIdPattern.test(expectedKeyId)) {
    throw new CapabilityError(
      "CAPABILITY_INVALID",
      "capability exceeds its format boundary",
    );
  }
  const segments = token.split(".");
  if (segments.length !== 3 || segments.some((segment) => !segment)) {
    throw new CapabilityError(
      "CAPABILITY_INVALID",
      "capability must have three compact segments",
    );
  }
  const [headerSegment, payloadSegment, signatureSegment] = segments;
  parseHeader(decodeJson(headerSegment), expectedKeyId);
  let signature: Buffer;
  try {
    if (!base64UrlPattern.test(signatureSegment)) {
      throw new Error("signature is not base64url");
    }
    signature = Buffer.from(signatureSegment, "base64url");
    if (signature.toString("base64url") !== signatureSegment) {
      throw new Error("signature is not canonical base64url");
    }
  } catch {
    throw new CapabilityError(
      "CAPABILITY_INVALID",
      "capability signature is invalid",
    );
  }
  if (signature.length !== 64) {
    throw new CapabilityError(
      "CAPABILITY_INVALID",
      "capability signature has the wrong length",
    );
  }
  const signingInput = `${headerSegment}.${payloadSegment}`;
  let valid = false;
  try {
    const verified = verify(
      null,
      Buffer.from(signingInput, "ascii"),
      createPublicKey(publicKeyPem),
      signature,
    );
    const expected = Buffer.from([1]);
    const actual = Buffer.from([verified ? 1 : 0]);
    valid = timingSafeEqual(actual, expected);
  } catch {
    throw new CapabilityError(
      "CAPABILITY_KEY_INVALID",
      "capability public key could not verify",
    );
  }
  if (!valid) {
    throw new CapabilityError(
      "CAPABILITY_INVALID",
      "capability signature is invalid",
    );
  }
  const payload = parsePayload(decodeJson(payloadSegment));
  const nowSeconds = Math.floor(now / 1000);
  if (nowSeconds >= payload.expiresAt) {
    throw new CapabilityError("CAPABILITY_EXPIRED", "capability has expired");
  }
  if (
    payload.issuedAt > nowSeconds + 5 ||
    payload.expiresAt - payload.issuedAt >
      maximumTtlByAudience[payload.audience] ||
    payload.renderRevisionId !== expectedRenderRevisionId ||
    (payload.audience === "preview" &&
      (payload.draftId !== expectedPreviewDraftId ||
        payload.draftGeneration !== expectedPreviewDraftGeneration))
  ) {
    throw new CapabilityError(
      "CAPABILITY_PAYLOAD_INVALID",
      "capability authority is not active",
    );
  }
  return payload;
}
