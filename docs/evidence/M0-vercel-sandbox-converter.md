# M0 disposable Vercel Sandbox converter feasibility evidence

- Status: **PRIOR HAPPY-PATH PROVIDER SLICE PASSED; STRENGTHENED REPLAY PENDING; ORCHESTRATOR REJECTED**
- Last reconciled: 2026-07-21 America/New_York
- Scope: synthetic T004 feasibility proof; not a Callysto application deployment

## Result

On 2026-07-20, an ephemeral Vercel Sandbox executed a digest-pinned Callysto converter image. The execution
Sandbox was created with provider `deny-all` before the notebook fixture or image was uploaded. The
converter ran in a nested Docker container with `--network none`, a read-only root, UID/GID 65532,
all Linux capabilities dropped, `no-new-privileges`, a 64-process limit, a 64 MiB no-exec temporary
filesystem, a 512 MiB process address-space limit, a 30-second CPU-time limit, a 180-second outer
timeout, and only one read-only input plus one writable output mount.

The source image was built deterministically from two official, digest-pinned inputs:

- Astral standalone CPython 3.14.6 musl x86_64 archive,
  SHA-256 `f25064ecb3b07cfe2440b178e72001cf1e0d69a5e53625ca3a32b7ae4e2fdcc6`;
- Alpine 3.24.1 x86_64 minirootfs,
  SHA-256 `41f73e3cf5fa919b8aa5ca6b30dc48f0da2720776d7423e2a7748211456fe081`.

The resulting compressed Docker archive was mode `0600`, 31,857,168 bytes, and reproduced
SHA-256 `cf0f56ff2dc6e312b14a38824399a1dcb19dd04a7ae9db02f546f2b33efa1fb7`.
The outer Vercel bootstrap nevertheless installed Docker from the provider runtime's live `dnf`
repository. That package transaction was not digest- or NEVRA-pinned in advance, so the provider
slice is reproducible at the Callysto image boundary but is not a reproducible or certifying
measurement of the nested-Docker enforcement layer.

The allowlisted provider result was:

```json
{"evidence":{"bootstrap_cleanup_succeeded":true,"cleanup_succeeded":true,"snapshot_cleanup_succeeded":true,"bootstrap_input_or_secrets_present":false,"capabilities_dropped":true,"conversion_succeeded":true,"converter_environment_names":["LANG","LC_ALL","TZ"],"deterministic_retry":true,"docker_snapshot_bootstrap":true,"image_archive_sha256":"cf0f56ff2dc6e312b14a38824399a1dcb19dd04a7ae9db02f546f2b33efa1fb7","input_readable":true,"input_read_only":true,"manifest_and_output_digests_verified":true,"outer_metadata_endpoint_tcp_reachable":true,"nested_container":true,"network_policy":"deny-all","no_new_privileges":true,"notebook_execution":"forbidden_and_not_invoked","outer_public_ip_unreachable":true,"persistent":false,"project_state":"existing","resource_limits":"outer-1-vcpu-inner-512m-address-space-64-pids-30-cpu-seconds-180s","root_read_only":true,"runtime":"python3.14.6","sentinel_values_absent":true,"uid":65532},"mode":"converter","provider":"vercel-sandbox","schema_version":"callysto.vercel-sandbox-proof.v0","status":"ok"}
```

Two conversions used different injected sentinel values. Their exact manifests/results were
deterministic; expected digests, modes, regular-file layout, cell-ID uniqueness, declared
non-execution policy, and stdout/result agreement passed. No injected sentinel value appeared in
the accepted output. The allowlisted JSON above is the complete retained provider result; it did
not record the later literal marker, controlled canary, inherited-descriptor, Docker-version, or
proof-harness identity assertions.

The separate post-run reconciler returned zero matching Sandboxes and zero snapshots to clean, with
`cleanup_succeeded=true`. One empty, unlinked Vercel control-plane project named
`callysto-m0-proof` remains; it has no live deployment or Git connection. Two unintended temporary
deployment records created while exploring the Vercel build path were deleted immediately, and
their exact former URLs returned HTTP 404. They are not Callysto staging.

## Security interpretation and evidence limit

The nested converter happy path passed the recorded network/secret/process properties. The outer
Vercel Sandbox blocked public-IP access but accepted a TCP connection to `169.254.169.254:80` even
under provider `deny-all`. That negative finding matters:

- the converter remains defended because its actual code runs inside nested Docker `--network
  none`, and its independent probe confirmed both public-IP and metadata denial;
- the bootstrap receives neither notebook input nor Callysto runtime secrets; the outer execution
  Sandbox receives only the synthetic proof image/fixture and no credential, while the nested
  container remains the tested conversion boundary; and
- Vercel Sandbox is **rejected for the credential-bearing orchestrator** under the current D013
  contract. A DB/R2 hostname allowlist cannot be described as exclusive while link-local metadata
  remains reachable.

This is one operator-observed, disposable-provider feasibility slice, not provider attestation or a
security certification. It does not close T004. A complete converter gate still needs the current
literal execution-marker and controlled zero-hit canary replay, unexpected-FD assertion, hostile
MIME/limit/timeout/failure matrix, and evidence tied to the exact harness/runtime identity. A
production-capable orchestrator boundary that reaches only PostgreSQL/R2 also remains unselected
and unproven.

## Strengthened replay state

The checked-in harness now pins the hostile fixture digest, writes a literal marker before any
credential access, starts a controlled outer canary, proves the canary is live from a normal nested
container, resets it, attempts the same connection under `--network none`, requires an accepted
denial plus zero hits, then proves the canary is still live and resets it again before conversion.
It also opens and probes an unexpected inherited file descriptor, requires the child to report that
descriptor closed, records the exact installed Docker package and client/server versions, records
the proof-harness digest, and labels the live-`dnf` result `feasibility-only` with
`docker_bootstrap_reproducible=false`.

The launcher grants project-wide reconciliation authority only after resolving the exact
`callysto-m0-proof` project, rejecting a Git-linked project, rejecting project environment entries,
and verifying that the project has zero deployments. Reconciliation then aborts on any non-proof
Sandbox name, deletes only named proof Sandboxes and snapshots returned by that exact Sandbox-name
filter, and verifies that no Sandbox or created snapshot remains. Cleanup never mutates a provider
object merely because create/get returned it: the Sandbox name and the snapshot list/ID/source
session are independently re-fetched and matched first, with executable mismatch tests proving no
stop/delete call occurs. A created project snapshot left after those name-scoped deletions is unowned: reconciliation fails with
`RECONCILE_UNOWNED_SNAPSHOTS_PRESENT` and never deletes it. Eight local source-contract cases and
seven launcher cases cover these controls. The dedicated proof project must not be used
concurrently by another operator during reconciliation.

Those strengthened assertions have **not** run in Vercel. On 2026-07-21 the local safe launcher
reached the external-upload approval boundary before any Sandbox was created. Replaying requires
explicit approval to transmit the proof image, public harness, and synthetic hostile fixture to
Vercel. Until that replay succeeds, none of the new fields may be presented as provider evidence.

## Safe replay

The public proof script is intentionally not exposed as a direct npm command. Replay only through
[`scripts/run-m0-vercel-sandbox-proof.py`](../../scripts/run-m0-vercel-sandbox-proof.py), which
validates the local credential boundary and exact pinned Node runtime, resolves only the fixed proof
project, requires that it is unlinked, environment-empty, and deployment-empty, passes the
credential in the replacement process environment, suppresses provider stderr, and emits an
allowlisted result. Never set or print `VERCEL_TOKEN` manually, and never run another Sandbox job in
the proof project concurrently with reconciliation.

The deterministic image builder is
[`scripts/build-m0-converter-image.py`](../../scripts/build-m0-converter-image.py). Its two source
archives must be downloaded from the official URLs recorded in
[`proofs/m0/converter/source-provenance.json`](../../proofs/m0/converter/source-provenance.json) and
verified before use. No archive or built image is committed.

## Non-claims

This is not evidence for a web/API deployment, Cloudflare Worker/R2, real notebook data, a
production renderer, database/storage operations, recovery, OAuth/email, or a safe Vercel
orchestrator. The mutable live-`dnf` Docker bootstrap also prevents security-certification claims
until the enforcement runtime is pinned to an owner-approved immutable artifact or exact package
provenance. It neither authorizes M1 nor relaxes the no-metadata requirement.
