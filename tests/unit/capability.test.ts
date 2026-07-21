import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  buildContentArtifactUrl,
  CapabilityError,
  issueContentCapability,
  verifyContentCapability,
} from "../../lib/m0/capability.mts";
import { M0_CONTENT_INDEX_SHA256 } from "../../lib/m0/proof-content-index.mts";

const fixedNow = 2_000_000_000_000;
const keyId = "m0-unit-key";
const contentIndexSha256 = "a".repeat(64);
const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const privateKeyPem = privateKey
  .export({ format: "pem", type: "pkcs8" })
  .toString();
const publicKeyPem = publicKey
  .export({ format: "pem", type: "spki" })
  .toString();

function publicCapability(ttlSeconds = 60) {
  return issueContentCapability({
    audience: "public",
    contentIndexSha256,
    keyId,
    now: fixedNow,
    outputId: "hostile-html",
    privateKeyPem,
    proofId: "proof-unit",
    renderRevisionId: "rr-m0-isolation-v1",
    ttlSeconds,
  });
}

function verifyCapability(
  token: string,
  now = fixedNow,
  overrides: Partial<{
    expectedPreviewDraftGeneration: number;
    expectedPreviewDraftId: string;
    expectedContentIndexSha256: string;
    expectedRenderRevisionId: string;
  }> = {},
) {
  return verifyContentCapability({
    expectedContentIndexSha256: contentIndexSha256,
    expectedKeyId: keyId,
    expectedPreviewDraftGeneration: 7,
    expectedPreviewDraftId: "draft-m0-isolation",
    expectedRenderRevisionId: "rr-m0-isolation-v1",
    now,
    publicKeyPem,
    token,
    ...overrides,
  });
}

function forgeCapability(payload: Record<string, unknown>): string {
  const headerSegment = Buffer.from(
    JSON.stringify({
      algorithm: "Ed25519",
      keyId,
      type: "cly-content-capability-v2",
    }),
    "utf8",
  ).toString("base64url");
  const payloadSegment = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signingInput = `${headerSegment}.${payloadSegment}`;
  const signature = sign(
    null,
    Buffer.from(signingInput, "ascii"),
    privateKeyPem,
  ).toString("base64url");
  return `${signingInput}.${signature}`;
}

describe("M0 content capabilities", () => {
  it("binds a public capability to the exact proof output and render revision", () => {
    const proofArtifactIndex = readFileSync(
      new URL(
        "../../contracts/m0-isolation-proof-content-index.json",
        import.meta.url,
      ),
    );
    expect(createHash("sha256").update(proofArtifactIndex).digest("hex")).toBe(
      M0_CONTENT_INDEX_SHA256,
    );

    const issued = publicCapability();
    const payload = verifyCapability(issued.token, fixedNow + 59_000);

    expect(payload).toMatchObject({
      audience: "public",
      contentIndexSha256,
      outputId: "hostile-html",
      proofId: "proof-unit",
      renderRevisionId: "rr-m0-isolation-v1",
    });
    expect(payload.expiresAt - payload.issuedAt).toBe(60);
    expect(payload).not.toHaveProperty("draftId");
    expect(payload).not.toHaveProperty("draftGeneration");
    const artifactUrl = new URL(
      buildContentArtifactUrl({
        contentOrigin: "https://content.example.test",
        outputId: payload.outputId,
        token: issued.token,
      }),
    );
    expect(artifactUrl.pathname).toBe("/v0/outputs/hostile-html");
    expect(artifactUrl.searchParams.getAll("cap")).toEqual([issued.token]);
    expect(() =>
      buildContentArtifactUrl({
        contentOrigin: "https://user:password@content.example.test",
        outputId: payload.outputId,
        token: issued.token,
      }),
    ).toThrowError(expect.objectContaining({ code: "CAPABILITY_INVALID" }));
  });

  it("expires at the server-authored public bound", () => {
    const issued = publicCapability();
    expect(() =>
      verifyCapability(issued.token, fixedNow + 60_000),
    ).toThrowError(expect.objectContaining({ code: "CAPABILITY_EXPIRED" }));
  });

  it("binds preview authority to the exact draft generation", () => {
    const issued = issueContentCapability({
      audience: "preview",
      contentIndexSha256,
      draftGeneration: 7,
      draftId: "draft-m0-isolation",
      keyId,
      now: fixedNow,
      outputId: "hostile-svg",
      privateKeyPem,
      proofId: "proof-preview",
      renderRevisionId: "rr-m0-isolation-v1",
      ttlSeconds: 300,
    });
    const payload = verifyCapability(issued.token);
    expect(payload).toMatchObject({
      audience: "preview",
      draftGeneration: 7,
      draftId: "draft-m0-isolation",
    });
    expect(payload.expiresAt - payload.issuedAt).toBe(300);
  });

  it("fails closed after compact-payload tampering", () => {
    const issued = publicCapability();
    const [header, payload, signature] = issued.token.split(".");
    const replacement = payload.endsWith("A")
      ? `${payload.slice(0, -1)}B`
      : `${payload.slice(0, -1)}A`;
    expect(() =>
      verifyCapability(`${header}.${replacement}.${signature}`),
    ).toThrow(CapabilityError);
  });

  it("rejects public tokens carrying draft authority", () => {
    expect(() =>
      issueContentCapability({
        audience: "public",
        contentIndexSha256,
        draftGeneration: 7,
        draftId: "draft-m0-isolation",
        keyId,
        now: fixedNow,
        outputId: "hostile-html",
        privateKeyPem,
        proofId: "proof-unit",
        renderRevisionId: "rr-m0-isolation-v1",
        ttlSeconds: 60,
      }),
    ).toThrowError(
      expect.objectContaining({ code: "CAPABILITY_PAYLOAD_INVALID" }),
    );
  });

  it("enforces authority and lifetime independently at verification", () => {
    const publicToken = publicCapability().token;
    expect(() =>
      verifyCapability(publicToken, fixedNow, {
        expectedContentIndexSha256: "b".repeat(64),
      }),
    ).toThrowError(
      expect.objectContaining({ code: "CAPABILITY_PAYLOAD_INVALID" }),
    );
    expect(() =>
      verifyCapability(publicToken, fixedNow, {
        expectedRenderRevisionId: "rr-replaced",
      }),
    ).toThrowError(
      expect.objectContaining({ code: "CAPABILITY_PAYLOAD_INVALID" }),
    );

    const previewToken = issueContentCapability({
      audience: "preview",
      contentIndexSha256,
      draftGeneration: 7,
      draftId: "draft-m0-isolation",
      keyId,
      now: fixedNow,
      outputId: "hostile-html",
      privateKeyPem,
      proofId: "proof-preview",
      renderRevisionId: "rr-m0-isolation-v1",
      ttlSeconds: 300,
    }).token;
    expect(() =>
      verifyCapability(previewToken, fixedNow, {
        expectedPreviewDraftGeneration: 8,
      }),
    ).toThrowError(
      expect.objectContaining({ code: "CAPABILITY_PAYLOAD_INVALID" }),
    );

    expect(() => publicCapability(61)).toThrowError(
      expect.objectContaining({ code: "CAPABILITY_PAYLOAD_INVALID" }),
    );
    const futureIssuerToken = issueContentCapability({
      audience: "public",
      contentIndexSha256,
      keyId,
      now: fixedNow + 5_000,
      outputId: "hostile-html",
      privateKeyPem,
      proofId: "proof-unit",
      renderRevisionId: "rr-m0-isolation-v1",
      ttlSeconds: 60,
    }).token;
    expect(() => verifyCapability(futureIssuerToken, fixedNow)).toThrowError(
      expect.objectContaining({ code: "CAPABILITY_PAYLOAD_INVALID" }),
    );
    expect(verifyCapability(futureIssuerToken, fixedNow + 5_000)).toMatchObject(
      {
        contentIndexSha256,
      },
    );
    const issuedAt = Math.floor(fixedNow / 1000);
    const forgedLongToken = forgeCapability({
      audience: "public",
      contentIndexSha256,
      expiresAt: issuedAt + 61,
      issuedAt,
      outputId: "hostile-html",
      proofId: "proof-unit",
      renderRevisionId: "rr-m0-isolation-v1",
      type: "cly-content-capability-v2",
    });
    expect(() => verifyCapability(forgedLongToken)).toThrowError(
      expect.objectContaining({ code: "CAPABILITY_PAYLOAD_INVALID" }),
    );
  });

  it("rejects signed tokens with extra or non-canonical fields", () => {
    const issuedAt = Math.floor(fixedNow / 1000);
    const token = forgeCapability({
      audience: "public",
      contentIndexSha256,
      expiresAt: issuedAt + 60,
      issuedAt,
      outputId: "hostile-html",
      proofId: "proof-unit",
      renderRevisionId: "rr-m0-isolation-v1",
      storageKey: "must-never-be-authority",
      type: "cly-content-capability-v2",
    });
    expect(() => verifyCapability(token)).toThrowError(
      expect.objectContaining({ code: "CAPABILITY_PAYLOAD_INVALID" }),
    );

    const [header, payload, signature] = publicCapability().token.split(".");
    expect(() =>
      verifyCapability(`${header}=.${payload}.${signature}`),
    ).toThrow(CapabilityError);
    expect(() => verifyCapability("A".repeat(2_049))).toThrowError(
      expect.objectContaining({ code: "CAPABILITY_INVALID" }),
    );
  });
});
