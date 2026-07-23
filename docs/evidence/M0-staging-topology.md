# Milestone 0 disposable staging topology

**Status:** strengthened disposable-provider converter pass; integrated staging blocked

**Last reconciled:** 2026-07-22 22:32 -03 (2026-07-23T01:32Z)

**Scope:** T004/T008 feasibility evidence only; this document does not authorize M1 implementation

## 1. Planned versus observed result

The original disposable split-rig proposal produced one useful pass and one decisive platform
rejection. The current evidence is:

| Boundary | Planned | Observed through 2026-07-22 |
|---|---|---|
| Application/issuer | Vercel Preview | Not deployed. Two accidental temporary Vercel build deployments were deleted immediately and their former URLs returned 404. |
| Content gateway | Worker on dedicated `workers.dev` | Source-level eight-case contract passes locally; no Worker or hostname exists. |
| Object storage | Four private, separately credentialed R2 buckets | No bucket or dedicated credential exists. |
| Orchestrator | Default-deny compute allowing exact PostgreSQL/R2 only | Vercel outer runtime rejected: link-local metadata accepted TCP under `deny-all`. Railway compute remains rejected for lack of a documented destination allowlist. No orchestrator proof ran with credentials. |
| Converter | Vercel `deny-all` plus nested hardened no-network container | Strengthened synthetic slice passed in ephemeral Vercel compute; outer public IP denied, inner public IP/metadata denied, deterministic conversion, marker, canary, inherited-FD, identity, and cleanup evidence recorded. The outer metadata TCP probe still connected, and the mutable live-`dnf` Docker bootstrap limits the result to feasibility evidence. |
| Database/recovery | Disposable Railway PostgreSQL/PITR/isolated restore | Read-only account/cost/PITR preflight only; no project or database created. |
| Controller | Trusted one-off local process | Used a fail-closed local launcher and official Vercel client; only allowlisted output left the process. |

The original two-Sandbox topology is not accepted. The nested converter technique remains a viable
component, but the credential-bearing orchestrator needs a different provider/enforcement boundary.
No production controller or integrated staging design is approved.

## 2. Why Railway compute is rejected

Railway's current official documentation describes ordinary outbound Internet connectivity, static outbound source IPs on Pro, and optional outbound IPv6. It does not document a per-service destination allowlist or a deny-all egress firewall. Its private network protects communication among services in one project/environment; it does not state that public IPv4 egress is disabled. A static source IP lets a destination identify Railway traffic but does not prevent the service from contacting other destinations.

That fails the D013/T004 acceptance condition. Application-level URL checks, container environment cleanup, DNS overrides, or an unprivileged process attempting to configure its own firewall are not equivalent to a provider- or kernel-enforced boundary. Therefore:

- do not deploy the orchestrator or converter as Railway compute;
- do not deploy the web application there as part of an architecture that implies T004 is closed;
- do not use Railway private networking as evidence that public Internet or metadata egress is denied; and
- keep Railway eligible only for the disposable PostgreSQL/PITR experiment until a later approved decision changes the platform boundary.

Official evidence:

- [Railway outbound networking](https://docs.railway.com/networking/outbound-networking)
- [Railway private networking](https://docs.railway.com/networking/private-networking)

## 3. Current proof topology and missing topology

```text
browser
  | app cookie; no notebook-controlled active output
  v
Vercel Preview: application + short-capability issuer [NOT CREATED]
  | Ed25519 private key only here
  | capability contains opaque output ID, audience, expiry
  v
Cloudflare Worker: dedicated *.workers.dev gateway [LOCAL CONTRACT ONLY]
  | no application cookie; Ed25519 public key only
  | short-lived R2 session credential: GetObject + HeadObject only
  v
private R2 derived bucket

trusted disposable proof controller
  |-- credential-bearing orchestrator [PLATFORM UNSELECTED]
  |     required = exact PostgreSQL/R2 only + metadata denial
  |
  `-- Vercel Sandbox: strengthened converter probe [PASSED, THEN DELETED]
        network = deny-all from creation, including DNS
        credentials = none
        nested container = --network none, read-only, non-root, bounded

Railway DB-only disposable project [NOT CREATED]
  `-- PostgreSQL source + PITR archive + restored sibling
        (provider mechanics only; see the isolation caveat in section 9)
```

If this candidate application/gateway pair is later provisioned, the unrelated sites (`vercel.app`
and `workers.dev`) preserve the intended cookie boundary. The local Worker contract already rejects
`Cookie`, emits no `Set-Cookie`, never accepts an arbitrary key, and returns `private, no-store`;
provider/CDN behavior remains unverified.

## 4. Cloudflare and R2 design

Create four new private, disposable buckets. Do not reuse any existing bucket and do not enable `r2.dev` public access.

| Bucket role | Example disposable name | Runtime access |
| --- | --- | --- |
| Incoming | `callysto-m0-incoming` | browser writes only through a web-issued, server-selected upload capability; orchestrator reads/promotes; no gateway access |
| Primary | `callysto-m0-primary` | orchestrator writes/reads accepted and normalized objects; no gateway access |
| Derived | `callysto-m0-derived` | orchestrator writes; gateway gets only `GetObject`/`HeadObject` under the render prefix |
| Recovery | `callysto-m0-recovery` | dedicated copy identity writes without delete; separate restore identity reads; no normal runtime delete |

Bucket separation is required because permanent R2 Object tokens are bucket-scoped but their preset Object Read permissions include object listing. A direct Worker R2 binding is also not a provider-enforced read-only binding: Worker code receives the bucket API, including write/delete methods. Neither mechanism, by itself, satisfies the accepted gateway contract of read-only object fetches with no bucket listing.

For this short M0 proof, mint an R2 temporary S3 credential by local signing with:

- one bucket only;
- the exact derived render prefix;
- explicit actions `GetObject` and `HeadObject` only;
- the shortest useful TTL, never more than the platform's seven-day maximum; and
- no parent R2 credential in the Worker.

Inject only the resulting access key, secret, and session token as Worker secrets. The trusted minting process retains the parent credential. Cloudflare documents that explicit S3 actions such as `GetObject` and `HeadObject` deny `ListObjectsV2`; explicit action scoping currently requires local signing. A long-lived pilot gateway would therefore need an approved rotation/broker design or a different provider-enforced read-only/no-list mechanism. The disposable credential is not that production design.

The recovery proof must combine:

- a conditional create (`If-None-Match: *` or equivalent) so an existing recovery key is not overwritten;
- a bucket lock long enough to cover the proof window;
- a runtime writer that lacks delete and bucket-configuration permissions; and
- a separately held restore reader.

The lock prevents an ordinary object credential from overwriting/deleting protected objects; a provisioning identity capable of changing bucket configuration must never be a runtime identity.

Illustrative Worker configuration (placeholders only; no credentials belong in this file):

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "callysto-m0-content",
  "main": "src/index.ts",
  "compatibility_date": "2026-07-20",
  "workers_dev": true,
  "preview_urls": false
}
```

Do not add an `r2_buckets` binding to the accepted least-privilege proof configuration. Use an S3 SigV4 client with the short session credential. If `aws4fetch` or another signer is proposed, it is a new dependency and needs the dependency review required by `AGENTS.md`; otherwise implement and test the small SigV4 surface in-repository.

Official evidence:

- [Cloudflare Worker routing](https://developers.cloudflare.com/workers/configuration/routing/)
- [Cloudflare `workers.dev`](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
- [R2 API-token permissions](https://developers.cloudflare.com/r2/api/tokens/)
- [R2 temporary credentials and explicit actions](https://developers.cloudflare.com/r2/api/s3/temporary-credentials/)
- [R2 S3 compatibility and conditional operations](https://developers.cloudflare.com/r2/api/s3/api/)
- [R2 bucket locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/)
- [R2 consistency](https://developers.cloudflare.com/r2/reference/consistency/)

## 5. Vercel Sandbox result and boundary

Vercel documents `allow-all`, `deny-all`, and user-defined default-deny firewall modes. Real proof
execution confirmed that public IP access failed under `deny-all`, but a TCP connection to
`169.254.169.254:80` succeeded. Provider `deny-all` therefore does not satisfy Callysto's strict
metadata-denial requirement for a credential-bearing process.

The converter Sandbox never received database/R2 credentials. Do not place the orchestrator in the
same outer runtime or describe Vercel's two-host allowlist as an accepted exclusive boundary.

### Rejected experiment: Sandbox A orchestrator egress

The checked-in harness can probe a user-defined policy containing only:

- the exact Railway PostgreSQL public TLS hostname; and
- the exact Cloudflare R2 S3 hostname for the approved account.

Do not run this mode with real credentials unless Vercel first provides and a new proof verifies a
metadata-denial primitive. PostgreSQL TLS and R2 reachability alone cannot override the negative
link-local result.

SDK-shape example; all values come from the trusted controller and none are printed:

```ts
const orchestrator = await Sandbox.create({
  teamId,
  projectId,
  token,
  timeout: 5 * 60 * 1000,
  networkPolicy: {
    allow: [postgresTlsHostname, r2S3Hostname],
  },
});
```

The `token`, `teamId`, and `projectId` authenticate the controller to Vercel; they are not environment variables inside the Sandbox. Inject only the minimum staging DB/R2 runtime credentials into the orchestrator command.

### Passed strengthened synthetic experiment: converter proof

The 2026-07-22 owner-approved replay created `networkPolicy: "deny-all"` with an empty application
environment, then uploaded only the checksum-verified image, public harness, and synthetic hostile
fixture. A separate secret-free bootstrap installed Docker, was snapshotted, and was deleted
without receiving notebook input or Callysto runtime secrets.
That Docker install came from the provider runtime's live `dnf` repository and was not pinned to an
owner-approved NEVRA or immutable package digest before execution. The checked-in replay records
the resulting package plus client/server versions and explicitly labels the result
`feasibility-only`; it cannot certify the enforcement runtime.

The replay used Python 3.14.6 and Docker 25.0.14. Its image, fixture, and public harness SHA-256
values were respectively
`cf0f56ff2dc6e312b14a38824399a1dcb19dd04a7ae9db02f546f2b33efa1fb7`,
`b3d98d16d91ecf1216b81306745e4e2ee5b21777172e06bb715b90bd051cc137`, and
`3da94b2033bd4556a0eb49586c22c30ff85f9efd6289e73aba4745c3deac27d3`.
Non-execution, deterministic retry, controlled canary, inherited-descriptor, nested isolation, and
identity checks passed. The outer metadata TCP probe remained reachable.

Run the uploaded image with an equivalent of:

```sh
docker run --rm \
  --network none \
  --read-only \
  --user 65532:65532 \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --pids-limit 64 \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --mount type=bind,src=/proof/input,dst=/input,readonly \
  --mount type=bind,src=/proof/output,dst=/output \
  callysto-converter@sha256:<approved-digest> \
  python -m callysto_m0.converter_cli /input/source.ipynb /output/result
```

Nested Docker did not support the proposed `--memory`/`--cpus` cgroup flags in this runtime. The
executed boundary instead used one outer vCPU, inner Linux `RLIMIT_AS=512 MiB`,
`RLIMIT_CPU=30 seconds`, `--pids-limit 64`, and a 180-second outer timeout. All other hardening flags
above were enforced. The immutable archive digest, exact image inputs, output contract, and result
are in [`M0-vercel-sandbox-converter.md`](./M0-vercel-sandbox-converter.md).

Do not treat the Vercel base runtime alone as sufficient: Vercel documents that its default `vercel-sandbox` user has `sudo`. The nested non-root container and the negative privilege tests are required.

Official evidence:

- [Vercel Sandbox overview and Firecracker isolation](https://vercel.com/docs/sandbox)
- [Sandbox firewall modes, PostgreSQL handling, and live policy enforcement](https://vercel.com/docs/sandbox/concepts/firewall)
- [Sandbox runtimes, default sudo, nested containers, and firewall inheritance](https://vercel.com/docs/sandbox/concepts/runtimes)
- [Sandbox authentication](https://vercel.com/docs/sandbox/concepts/authentication)

## 6. Vercel account, project, and cost boundary

Account inspection and proof execution established:

- the local CLI credential is active;
- one personal Hobby scope and two team Pro scopes are reachable;
- the owner-selected side-project team now contains an empty `callysto-m0-proof` project; and
- this repository has no `.vercel/project.json`, Git connection, deployment, alias, or domain.

The selected team is intentionally described by role rather than its account identifier. The small
project control-plane record persists until separately approved cleanup; it serves no traffic.

A one-off Sandbox session does **not** require a deployed application, but it does require persistent Vercel project attribution:

- local OIDC authentication starts by linking to a Vercel project; or
- access-token authentication requires a team ID and project ID.

The established minimum is the dedicated `callysto-m0-proof` project in the selected scope. It has
no Git connection or deployment. Sandbox sessions are ephemeral and must be stopped/deleted
immediately; the small project control-plane record remains until separately approved cleanup.

Vercel Sandbox is metered. On Pro, all active CPU, provisioned memory, creation, network, and snapshot usage is charged against the team's monthly usage credit, then billed at the published rates. Vercel's current example estimates a two-minute one-vCPU quick test at about USD 0.01 under full CPU use; actual proof cost includes two Sandboxes, file transfer, and duration. Set a five-minute timeout, disable persistence/snapshots where the selected SDK supports it, stop/delete in `finally`, and configure a low spend alert/hard limit before running. Pro is not technically required for a short Sandbox—the Hobby plan has a capped free allowance—but Callysto should use the owner-approved Pro team for project ownership and spend controls rather than a personal Hobby scope. Pro is required for 24-hour sessions and some advanced brokering/proxy features; this M0 proof should not need a long session.

Official evidence:

- [Sandbox authentication requires project attribution](https://vercel.com/docs/sandbox/concepts/authentication)
- [Sandbox pricing and limits](https://vercel.com/docs/sandbox/pricing)

## 7. Minimum resources and credentials

No existing general-purpose cloud resource should be reused. Minimum provisioning is:

| Provider/boundary | Minimum disposable resource | Minimum credential posture |
| --- | --- | --- |
| Vercel | existing empty proof project; no Preview deployment; future converter sessions only when replay is needed | the validated local controller credential never enters bootstrap/execution Sandboxes; no secret-bearing orchestrator on this runtime |
| Cloudflare | one Worker on `workers.dev`; four new private R2 buckets; bucket lock on recovery | dedicated short-lived/deployment token for provisioning; separate operation-scoped R2 identities; gateway receives only short Get/Head session credentials; Ed25519 public key only |
| Railway | one new DB-only project/environment; one Postgres service; PITR archive; one restored sibling; optional second isolated restore project | newly secured/scoped Railway credential; separate source, restore-admin, and validation DB credentials; no application service |
| Issuer | Vercel Preview or local proof issuer | staging-only Ed25519 private key; never supplied to Worker, R2, Railway, or Sandbox converter |
| Converter | one immutable OCI image and hostile fixture bundle | no cloud, database, storage, session, OAuth, signing, or deployment identity |
| Proof controller | one operator workstation process or separately approved CI job | reads credentials from secured storage in-process; emits only allowlisted status/evidence; never echoes, copies, hashes, or commits secrets |

Before using any local or VPS credential, validate that the complete parent directory chain and file are controlled by the expected owner and have owner-only permissions. Existing broad/shared credentials are inventory evidence only; create dedicated Callysto credentials. Never place a token in a command-line argument, shell history, repository file, test artifact, build log, or chat. The exact hidden-prompt handoff is in [`docs/VPS_CREDENTIAL_HANDOFF.md`](../VPS_CREDENTIAL_HANDOFF.md).

## 8. Required proof sequence and assertions

Further provisioning requires dedicated Cloudflare/R2 credentials, an explicit Railway plan/spend
boundary and dedicated credential, and a metadata-safe orchestrator platform. The Vercel converter
proof does not authorize the blocked provider work.

### A. Gateway and cookieless-origin proof

1. Create private derived bucket and upload only synthetic M0 artifacts.
2. Mint Get/Head-only, prefix-scoped, expiring R2 session credentials; verify List/Put/Delete each return access denied.
3. Deploy the Worker on `workers.dev` with only the Ed25519 public key and short R2 session credential.
4. Deploy or run the issuer on the Vercel Preview origin with the private signing key.
5. In Chromium and Firefox, set an application-origin sentinel cookie and request every hostile fixture through the gateway.
6. Prove the Worker saw `cookie_present=false` without logging cookie contents; prove there is no `Set-Cookie` response.
7. Assert exact CSP, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, safe content type, and safe disposition.
8. Assert valid capability success and invalid signature, non-canonical token, wrong audience, expired token, unknown/revoked output, traversal, encoded traversal, and arbitrary-key failure.
9. Revoke an output, stop new issuance, and measure denial no later than the accepted capability bound.

Read-only unauthorized response-header probe after deployment:

```sh
curl --fail-with-body --silent --show-error --dump-header - \
  --output /dev/null \
  'https://<worker>.workers.dev/v1/output/not-a-real-id'
```

The valid-capability test must obtain and consume the capability inside one browser/test process. Never place a real capability in a command argument, shell history, environment variable, committed output, or raw URL log. The evidence sanitizer must preserve only allowlisted boolean/header assertions and synthetic IDs.

### B. Orchestrator egress proof — **not run; platform rejected**

1. Create Sandbox A with the two-host allowlist at creation.
2. Verify TLS PostgreSQL connectivity and an exact R2 Put/Head/Get on synthetic keys.
3. Verify DNS and TCP/HTTPS fail for a controlled public canary, a random DNS name, an unapproved Cloudflare hostname, and `169.254.169.254`.
4. Verify R2 List/Delete, another prefix, and another bucket are denied by storage credentials even though the R2 hostname is network-allowed.
5. Prove there is no listener and only the allowlisted environment keys/FDs exist.
6. Record the Sandbox ID, policy projection, image/runtime digest, timestamps, and boolean results; do not record credentials, database URLs, account IDs, object keys, or response bodies.

### C. Converter boundary proof — **partial pass in disposable provider compute**

1. Created the execution Sandbox with `deny-all` at creation and no secret environment.
2. Uploaded the SHA-verified OCI image, public harness, and synthetic fixture from the trusted
   controller under the owner's bounded approval.
3. Launched the nested container with the hardened flags in section 5.
4. Proved non-root UID, no effective capabilities, read-only root, bounded output/tmp mounts, the
   allowlisted environment, and closure of the unexpected inherited descriptor.
5. Proved nested DNS/public-IP/metadata denial. The controlled canary passed its pre-attempt positive
   control/reset, recorded zero hits from the explicit `--network none` attempt, and passed the
   post-attempt positive control/reset.
6. Output schema, cell IDs, image/fixture/harness digests, deterministic retry, sentinel-value
   absence, and literal marker absence passed. Hostile MIME/size/limit/timeout and
   deterministic-failure coverage remain required for the complete deployed gate.
7. Stopped/deleted execution/bootstrap Sandboxes and snapshot. Independent strengthened
   reconciliation returned `status=ok`, `project_exclusive=true`, zero Sandboxes, zero created
   snapshots, and cleanup true. The reconciler uses bounded provider pagination/timeouts and still
   requires no concurrent proof-project use.

### D. Recovery proof

1. Create database marker A, record a trusted timestamp, create marker B, and choose a PITR target between them.
2. Wait until Railway displays a usable restore range; do not infer readiness from `archive_timeout=60` alone.
3. Restore to the target. Assert the source remains live, the restored sibling contains A and excludes B, and record measured RPO/RTO.
4. Do not connect application services to the sibling. Rotate/stage its validation credential before any broader access.
5. Copy or logical-restore the validated point into a second DB-only project/environment with new credentials before destructive or application-level recovery drills. Measure this second stage in total RTO.
6. For R2, conditionally create the recovery copy, compare its digest to the accepted original, then prove overwrite/delete fail under the recovery writer and lock.
7. Retrieve with the separate recovery reader, compare the digest again, and regenerate the derived
   render through the proven nested converter boundary.
8. Accept T008 only if the measured total meets RPO <=15 minutes and RTO <=8 hours, accepted-original recovery remains RPO 0, and no production identity/resource was involved.

## 9. Railway PITR evidence boundary

Railway PITR is a credible mechanism to test, but its documented restore is not itself the accepted isolated-restore topology:

- WAL is shipped asynchronously; a sustained archive outage can exhaust a 5 GiB queue and truncate the restore window.
- `archive_timeout=60` is configuration, not measured RPO.
- restore creates a brand-new sibling service beside the source and copies source environment variables except archive credentials.
- the source is not modified, which is good; however the fork is still in the same Railway project/environment.
- ordinary Railway volume backups can only restore into the same project and environment and are not a PITR substitute.

Run the provider-mechanics test only in a project containing no application services. A full isolation claim additionally requires the staged logical copy into a separate project/environment with new credentials, or selection of a provider that supports a directly isolated restore. If that second stage cannot be demonstrated within the RTO, T008 remains open.

Official evidence:

- [Railway point-in-time recovery](https://docs.railway.com/volumes/point-in-time-recovery)
- [Railway volume backups and restore limitation](https://docs.railway.com/volumes/backups)

## 10. Remaining blockers and non-claims

As of the reconciled execution:

- one empty Vercel proof project exists, but no Preview application, live Sandbox/snapshot,
  Cloudflare Worker, R2 bucket, Railway database, integrated staging, or production deployment
  exists;
- no dedicated Callysto Cloudflare deployment token or operation-scoped R2 identity has been established;
- the gateway's S3 SigV4 implementation/dependency and temporary-credential rotation path are not approved;
- the pinned converter OCI image, nested hardening, one real cloud happy path, and cleanup passed;
- the strengthened provider replay for literal marker, controlled canary, unexpected FD, Docker
  identity, project-exclusivity reconciliation, and harness identity passed on the synthetic
  fixture and all ephemeral provider resources reconciled to zero;
- the outer Docker bootstrap resolved from a live `dnf` repository, so the successful strengthened
  replay remains feasibility evidence rather than a security certification until the
  enforcement runtime is immutable and owner-approved;
- a production orchestrator-to-converter handoff that preserves the accepted egress contract has not been selected;
- Railway compute remains rejected unless a documented and tested enforcement primitive becomes available;
- Vercel Sandbox is rejected for the credential-bearing orchestrator because outer link-local
  metadata remained TCP reachable;
- Railway PITR and the second-stage isolated restore have not been provisioned or timed;
- Cloudflare/R2 capability delivery, lock behavior, no-list identity, cache/revocation bound, and hostile-browser suite are not cloud-verified; and
- T004 remains partial and T008 remains open. The provider converter slice does not close either
  the complete deployed converter matrix or the orchestrator/recovery boundaries.

Do not describe this record as a deployment, staging launch, security certification, production architecture approval, or successful recovery drill.

## 11. Recommended decision amendment

The following is proposed wording for owner review. It does not change `DECISIONS.md` by itself.

> **D013 amendment candidate — M0 compute and recovery evidence**
>
> Railway application compute remains rejected because current documented networking does not
> provide the required destination allowlist/deny-all boundary. Vercel Sandbox is accepted only as
> a disposable happy-path feasibility slice for the credential-free converter running inside
> nested `--network none`;
> its outer runtime is rejected for the credential-bearing orchestrator because link-local metadata
> remained reachable under `deny-all`. Railway remains eligible for a separately approved DB-only
> PITR proof. Select a different orchestrator platform/control boundary that proves exact
> PostgreSQL/R2-only egress plus metadata denial. No M1 implementation or pilot data is permitted
> until that decision and the T004/T008 gates are complete.
