# M0 Cloudflare content-gateway contract

Status: **local contract only; no Cloudflare resource or deployment is created by these files**.

This proof scaffold implements the content-serving side of the approved Callysto isolation boundary. It accepts one canonical Ed25519 `cly-content-capability-v2` for an exact opaque output ID and exact content-index SHA-256. It reads `manifests/{renderRevisionId}/{contentIndexSha256}.json` through an object-get-only interface, verifies the exact index bytes against the signed digest before parsing, derives the artifact key from validated identifiers and its recorded SHA-256, verifies size and digest, and returns the artifact with the required no-store and isolation headers. An existing capability therefore cannot authorize bytes from a replaced index.

Public and preview expiry are also bounded against the Worker's current time, not only the signed issuer timestamp. The allowed five-second future-issuer tolerance cannot extend public delivery beyond 60 seconds or preview delivery beyond 300 seconds from the gateway's perspective.

The Worker intentionally has no database, session, OAuth, application signing key, arbitrary object-key, bucket-list, write, or delete interface. Requests carrying a cookie fail closed. Errors use a neutral body and never echo the capability, object key, or provider detail.

## Local validation

Run the isolated contract suite with the repository's pinned Node runtime:

```text
npx vitest run tests/integration/m0-cloudflare-content-gateway-contract.test.ts
```

The eight tests use in-memory synthetic bytes and an object exposing only `get`. They include issuer-to-Worker interoperability with the checked-in canonical index, duplicate-key rejection, a future-issuer/full-TTL rejection, and a replaced index stored under the previously signed key. The hostile cases fail before artifact access. They do not use Cloudflare credentials, call R2, deploy a Worker, or prove browser/CDN behavior.

## Configuration boundary

`wrangler.local-contract-only.example.toml` contains placeholders and public configuration only. It
is deliberately marked local-contract-only and contains no R2 binding. The Ed25519 SPKI verification
key is public material. Never put the issuer private key, Cloudflare token, R2 secret/access key,
database URL, OAuth value, or session material in this file or a command argument.

The in-memory test adapter proves only the source-level object-`get` contract. A normal Worker R2
binding may carry broader provider authority than the gateway is permitted to have and is not an
accepted staging configuration. Before staging can close M0.5/M0.6, route reads through the approved
Get/Head-only broker or a provider-enforced SigV4 read identity, then prove that the deployed gateway
has no list, write, delete, original-object, or recovery-object access. No deployable storage binding
is claimed or supplied by this directory.

## Still unproven

- Cloudflare account access and resource provisioning;
- provider-enforced read-only/no-list derived-artifact authority;
- real Worker-to-private-R2 delivery and deterministic key layout;
- a dedicated cookieless hostname, cookie scope, CDN/no-store behavior, and access-log redaction;
- deployed capability expiry/restriction latency, key rotation, and propagation behavior;
- real-browser iframe isolation against the deployed hostname.

Until those checks pass, this scaffold is local feasibility evidence and not a staging or production gateway.
