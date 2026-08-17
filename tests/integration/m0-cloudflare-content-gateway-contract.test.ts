import { createHash, generateKeyPairSync } from "node:crypto";
import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  createContentGateway,
  type ContentGatewayEnvironment,
  type ReadOnlyR2Binding,
} from "../../infra/cloudflare/content-gateway/worker";
import {
  buildContentArtifactUrl,
  issueContentCapability,
} from "../../lib/m0/capability.mts";

const fixedNow = 2_000_000_000_000;
const keyId = "m0-worker-key";
const appOrigin = "https://staging.callysto.io";
const artifactPrefix = "staging/";
const outputId = "hostile-html";
const renderRevisionId = "rr-m0-cloudflare-v1";
const body = new TextEncoder().encode(
  "<!doctype html><html><body><script>window.top.location='https://example.com'</script><p>Isolated output</p></body></html>",
);
const bodySha256 = createHash("sha256").update(body).digest("hex");
const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const privateKeyPem = privateKey
  .export({ format: "pem", type: "pkcs8" })
  .toString();
const publicKeySpkiBase64Url = publicKey
  .export({ format: "der", type: "spki" })
  .toString("base64url");

type StoredObject = { bytes: Uint8Array; reportedSize?: number };

class GetOnlyObjectStore implements ReadOnlyR2Binding {
  readonly calls: string[] = [];

  constructor(private readonly objects: Map<string, StoredObject>) {}

  async get(key: string) {
    this.calls.push(key);
    const object = this.objects.get(key);
    if (!object) return null;
    const bytes = Uint8Array.from(object.bytes);
    return {
      arrayBuffer: async () => bytes.buffer,
      size: object.reportedSize ?? bytes.byteLength,
    };
  }
}

function indexBytes(
  overrides: Record<string, unknown> = {},
  descriptorOverrides: Record<string, unknown> = {},
): Uint8Array {
  return new TextEncoder().encode(
    JSON.stringify({
      artifacts: [
        {
          byte_size: body.byteLength,
          content_type: "text/html; charset=utf-8",
          output_id: outputId,
          sha256: bodySha256,
          ...descriptorOverrides,
        },
      ],
      render_revision_id: renderRevisionId,
      schema_version: "callysto.content-index.v0",
      ...overrides,
    }),
  );
}

function contentIndexDigest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function manifestKey(
  bytes = indexBytes(),
  revision = renderRevisionId,
): string {
  return `${artifactPrefix}manifests/${revision}/${contentIndexDigest(bytes)}.json`;
}

function artifactKey(
  revision = renderRevisionId,
  output = outputId,
  digest = bodySha256,
): string {
  return `${artifactPrefix}outputs/${revision}/${output}/${digest}`;
}

function storeWithValidArtifact(): GetOnlyObjectStore {
  return new GetOnlyObjectStore(
    new Map([
      [manifestKey(), { bytes: indexBytes() }],
      [artifactKey(), { bytes: body }],
    ]),
  );
}

function environment(store: ReadOnlyR2Binding): ContentGatewayEnvironment {
  return {
    CONTENT_APP_ORIGIN: appOrigin,
    CONTENT_ARTIFACT_PREFIX: artifactPrefix,
    CONTENT_ARTIFACTS: store,
    CONTENT_CAPABILITY_KEY_ID: keyId,
    CONTENT_CAPABILITY_PUBLIC_KEY_SPKI_BASE64URL: publicKeySpkiBase64Url,
  };
}

function capability({
  audience = "public",
  contentIndex = indexBytes(),
  now = fixedNow,
  ttlSeconds = audience === "public" ? 60 : 300,
}: {
  audience?: "preview" | "public";
  contentIndex?: Uint8Array;
  now?: number;
  ttlSeconds?: number;
} = {}): string {
  return issueContentCapability({
    audience,
    contentIndexSha256: contentIndexDigest(contentIndex),
    ...(audience === "preview"
      ? { draftGeneration: 3, draftId: "draft-m0-cloudflare" }
      : {}),
    keyId,
    now,
    outputId,
    privateKeyPem,
    proofId: "proof-m0-cloudflare",
    renderRevisionId,
    ttlSeconds,
  }).token;
}

function artifactRequest(token = capability(), requestedOutputId = outputId) {
  return new Request(
    `https://content.example.test/v0/outputs/${requestedOutputId}?cap=${encodeURIComponent(token)}`,
  );
}

const gateway = createContentGateway({ now: () => fixedNow });

describe("M0 Cloudflare content-gateway local contract", () => {
  it("serves only the exact signed, indexed, size- and digest-verified object", async () => {
    const store = storeWithValidArtifact();
    const response = await gateway.fetch(artifactRequest(), environment(store));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(new TextDecoder().decode(body));
    expect(store.calls).toEqual([manifestKey(), artifactKey()]);
    expect(response.headers.get("Content-Type")).toBe(
      "text/html; charset=utf-8",
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe(
      "cross-origin",
    );
    expect(response.headers.get("Content-Security-Policy")).toBe(
      [
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
      ].join("; "),
    );
    expect(response.headers.has("Set-Cookie")).toBe(false);
  });

  it("accepts the issuer URL and checked-in canonical proof index without translation", async () => {
    const checkedIndex = new Uint8Array(
      await readFile(
        new URL(
          "../../contracts/m0-isolation-proof-content-index.json",
          import.meta.url,
        ),
      ),
    );
    const checkedFixture = JSON.parse(
      await readFile(
        new URL(
          "../../contracts/m0-isolation-proof-artifacts.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as Array<{ body: string; id: string }>;
    const parsedIndex = JSON.parse(new TextDecoder().decode(checkedIndex)) as {
      artifacts: Array<{
        output_id: string;
        sha256: string;
      }>;
      render_revision_id: string;
    };
    const descriptor = parsedIndex.artifacts.find(
      ({ output_id }) => output_id === outputId,
    );
    const fixture = checkedFixture.find(({ id }) => id === outputId);
    expect(descriptor).toBeDefined();
    expect(fixture).toBeDefined();
    if (!descriptor || !fixture) {
      throw new Error("checked-in proof fixture is missing its indexed output");
    }
    const checkedBody = new TextEncoder().encode(fixture.body);
    const issued = issueContentCapability({
      audience: "public",
      contentIndexSha256: contentIndexDigest(checkedIndex),
      keyId,
      now: fixedNow,
      outputId,
      privateKeyPem,
      proofId: "proof-m0-issuer-worker",
      renderRevisionId: parsedIndex.render_revision_id,
      ttlSeconds: 60,
    });
    const issuedUrl = buildContentArtifactUrl({
      contentOrigin: "https://content.example.test",
      outputId,
      token: issued.token,
    });
    const checkedStore = new GetOnlyObjectStore(
      new Map([
        [
          manifestKey(checkedIndex, parsedIndex.render_revision_id),
          { bytes: checkedIndex },
        ],
        [
          artifactKey(
            parsedIndex.render_revision_id,
            outputId,
            descriptor.sha256,
          ),
          { bytes: checkedBody },
        ],
      ]),
    );
    const response = await gateway.fetch(
      new Request(issuedUrl),
      environment(checkedStore),
    );

    expect(new URL(issuedUrl).pathname).toBe("/v0/outputs/hostile-html");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(fixture.body);
    expect(checkedStore.calls).toEqual([
      manifestKey(checkedIndex, parsedIndex.render_revision_id),
      artifactKey(parsedIndex.render_revision_id, outputId, descriptor.sha256),
    ]);
  });

  it("rejects missing, duplicate, extra, mismatched, and expired capability authority before R2", async () => {
    const cases = [
      new Request(`https://content.example.test/v0/outputs/${outputId}`),
      new Request(
        `https://content.example.test/v0/outputs/${outputId}?cap=${encodeURIComponent(capability())}&cap=${encodeURIComponent(capability())}`,
      ),
      new Request(
        `https://content.example.test/v0/outputs/${outputId}?cap=${encodeURIComponent(capability())}&debug=1`,
      ),
      artifactRequest(capability(), "other-output"),
      artifactRequest(capability({ now: fixedNow - 61_000 })),
      artifactRequest(capability({ now: fixedNow + 5_000 })),
    ];

    for (const request of cases) {
      const store = storeWithValidArtifact();
      const response = await gateway.fetch(request, environment(store));
      expect(response.status).toBe(401);
      expect(store.calls).toEqual([]);
      expect(await response.text()).toContain("Content unavailable");
    }

    const synchronizedStore = storeWithValidArtifact();
    const synchronizedGateway = createContentGateway({
      now: () => fixedNow + 5_000,
    });
    const synchronized = await synchronizedGateway.fetch(
      artifactRequest(capability({ now: fixedNow + 5_000 })),
      environment(synchronizedStore),
    );
    expect(synchronized.status).toBe(200);
  });

  it("rejects cookies, arbitrary paths, and write methods without touching R2", async () => {
    const cookieStore = storeWithValidArtifact();
    const withCookie = artifactRequest();
    withCookie.headers.set("Cookie", "session=must-not-reach-content-origin");
    const cookieResponse = await gateway.fetch(
      withCookie,
      environment(cookieStore),
    );
    expect(cookieResponse.status).toBe(400);
    expect(cookieStore.calls).toEqual([]);

    const pathStore = storeWithValidArtifact();
    const pathResponse = await gateway.fetch(
      new Request(
        `https://content.example.test/v0/outputs/${outputId}%2F..%2Foriginal?cap=${encodeURIComponent(capability())}`,
      ),
      environment(pathStore),
    );
    expect(pathResponse.status).toBe(404);
    expect(pathStore.calls).toEqual([]);

    const methodStore = storeWithValidArtifact();
    const methodResponse = await gateway.fetch(
      new Request(artifactRequest(), { method: "POST" }),
      environment(methodStore),
    );
    expect(methodResponse.status).toBe(405);
    expect(methodResponse.headers.get("Allow")).toBe("GET");
    expect(methodStore.calls).toEqual([]);
  });

  it("fails closed on unindexed, ambiguous, oversized, or digest-mismatched artifacts", async () => {
    const missingDescriptorIndex = indexBytes({ artifacts: [] });
    const missingDescriptorStore = new GetOnlyObjectStore(
      new Map([
        [
          manifestKey(missingDescriptorIndex),
          { bytes: missingDescriptorIndex },
        ],
      ]),
    );
    const missingDescriptor = await gateway.fetch(
      artifactRequest(capability({ contentIndex: missingDescriptorIndex })),
      environment(missingDescriptorStore),
    );
    expect(missingDescriptor.status).toBe(404);
    expect(missingDescriptorStore.calls).toEqual([
      manifestKey(missingDescriptorIndex),
    ]);

    const ambiguousIndex = indexBytes({
      artifacts: [
        {
          byte_size: body.byteLength,
          content_type: "text/html; charset=utf-8",
          output_id: outputId,
          sha256: bodySha256,
        },
        {
          byte_size: body.byteLength,
          content_type: "text/html; charset=utf-8",
          output_id: outputId,
          sha256: bodySha256,
        },
      ],
    });
    const ambiguousStore = new GetOnlyObjectStore(
      new Map([[manifestKey(ambiguousIndex), { bytes: ambiguousIndex }]]),
    );
    const ambiguous = await gateway.fetch(
      artifactRequest(capability({ contentIndex: ambiguousIndex })),
      environment(ambiguousStore),
    );
    expect(ambiguous.status).toBe(503);
    expect(ambiguousStore.calls).toEqual([manifestKey(ambiguousIndex)]);

    const duplicateKeyIndex = new TextEncoder().encode(
      `{"artifacts":[],"artifacts":[${JSON.stringify({
        byte_size: body.byteLength,
        content_type: "text/html; charset=utf-8",
        output_id: outputId,
        sha256: bodySha256,
      })}],"render_revision_id":"${renderRevisionId}","schema_version":"callysto.content-index.v0"}`,
    );
    const duplicateKeyStore = new GetOnlyObjectStore(
      new Map([[manifestKey(duplicateKeyIndex), { bytes: duplicateKeyIndex }]]),
    );
    const duplicateKey = await gateway.fetch(
      artifactRequest(capability({ contentIndex: duplicateKeyIndex })),
      environment(duplicateKeyStore),
    );
    expect(duplicateKey.status).toBe(503);
    expect(duplicateKeyStore.calls).toEqual([manifestKey(duplicateKeyIndex)]);

    const oversizedIndex = indexBytes(
      {},
      { byte_size: 10 * 1_024 * 1_024 + 1 },
    );
    const oversizedStore = new GetOnlyObjectStore(
      new Map([[manifestKey(oversizedIndex), { bytes: oversizedIndex }]]),
    );
    const oversized = await gateway.fetch(
      artifactRequest(capability({ contentIndex: oversizedIndex })),
      environment(oversizedStore),
    );
    expect(oversized.status).toBe(503);
    expect(oversizedStore.calls).toEqual([manifestKey(oversizedIndex)]);

    const changedBody = new TextEncoder().encode("changed after indexing");
    const digestMismatchStore = new GetOnlyObjectStore(
      new Map([
        [manifestKey(), { bytes: indexBytes() }],
        [artifactKey(), { bytes: changedBody, reportedSize: body.byteLength }],
      ]),
    );
    const digestMismatch = await gateway.fetch(
      artifactRequest(),
      environment(digestMismatchStore),
    );
    expect(digestMismatch.status).toBe(503);
    expect(digestMismatchStore.calls).toEqual([manifestKey(), artifactKey()]);

    const substitutedBody = new TextEncoder().encode("substituted bytes");
    const substitutedBodySha256 = createHash("sha256")
      .update(substitutedBody)
      .digest("hex");
    const substitutedIndex = indexBytes(
      {},
      {
        byte_size: substitutedBody.byteLength,
        sha256: substitutedBodySha256,
      },
    );
    const substitutedIndexStore = new GetOnlyObjectStore(
      new Map([
        [manifestKey(), { bytes: substitutedIndex }],
        [
          artifactKey(renderRevisionId, outputId, substitutedBodySha256),
          { bytes: substitutedBody },
        ],
      ]),
    );
    const substituted = await gateway.fetch(
      artifactRequest(),
      environment(substitutedIndexStore),
    );
    expect(substituted.status).toBe(503);
    expect(substitutedIndexStore.calls).toEqual([manifestKey()]);
  });

  it("accepts a valid preview capability without weakening its 300-second bound", async () => {
    const store = storeWithValidArtifact();
    const response = await gateway.fetch(
      artifactRequest(capability({ audience: "preview" })),
      environment(store),
    );
    expect(response.status).toBe(200);

    const expiredStore = storeWithValidArtifact();
    const expiredGateway = createContentGateway({
      now: () => fixedNow + 300_000,
    });
    const expired = await expiredGateway.fetch(
      artifactRequest(capability({ audience: "preview" })),
      environment(expiredStore),
    );
    expect(expired.status).toBe(401);
    expect(expiredStore.calls).toEqual([]);
  });

  it("keeps the local-only configuration free of credentials and full R2 bindings", async () => {
    const template = await readFile(
      new URL(
        "../../infra/cloudflare/content-gateway/wrangler.local-contract-only.example.toml",
        import.meta.url,
      ),
      "utf8",
    );
    expect(template).toContain("LOCAL CONTRACT ONLY");
    expect(template).toContain("CONTENT_CAPABILITY_PUBLIC_KEY_SPKI_BASE64URL");
    expect(template).not.toMatch(/\[\[r2_buckets\]\]/u);
    expect(template).not.toMatch(/^binding\s*=/mu);
    expect(template).not.toMatch(
      /(?:ACCESS_KEY|AUTH_TOKEN|DATABASE_URL|PRIVATE_KEY|SECRET_ACCESS|SESSION_SECRET)\s*=/u,
    );
  });

  it("reports healthy only when public configuration and the verification key are usable", async () => {
    const store = storeWithValidArtifact();
    const healthy = await gateway.fetch(
      new Request("https://content.example.test/health"),
      environment(store),
    );
    expect(healthy.status).toBe(204);
    expect(store.calls).toEqual([]);

    const invalidEnvironment = {
      ...environment(store),
      CONTENT_CAPABILITY_PUBLIC_KEY_SPKI_BASE64URL: "not-an-ed25519-key",
    };
    const unhealthy = await gateway.fetch(
      new Request("https://content.example.test/health"),
      invalidEnvironment,
    );
    expect(unhealthy.status).toBe(503);
    expect(await unhealthy.text()).toContain("GATEWAY_CONFIGURATION_INVALID");
    expect(store.calls).toEqual([]);
  });
});
