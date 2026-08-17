# Dependency risk register

- Status: **MILESTONE 0 ACTIVE**
- Last reviewed: 2026-07-22
- Owner: project owner until a security owner is named in T010

## Install-script policy

`strict-allow-scripts=true` and the root `allowScripts` map deny lifecycle scripts from
`esbuild`, `fsevents`, `sharp`, and `unrs-resolver`. Locked prebuilt packages are used instead.
An unreviewed lifecycle script makes `npm ci` fail. The policy is verified locally on macOS arm64
and in the successful Ubuntu baseline [workflow run
29780426457](https://github.com/Chris-Side-Projects/callysto-notebooks/actions/runs/29780426457).
PR #2 workflow run 29797337843 passed the expanded gate on Ubuntu 24.04 for commit `1384dde`;
reconciled proof head `48805cc` passed the current expanded gate in
[run 29846200710](https://github.com/Chris-Side-Projects/callysto-notebooks/actions/runs/29846200710).

On 2026-07-21 a disposable strict install added 461 packages, executed no dependency lifecycle
script, and reported no unreviewed scripts pending. The production audit reported zero
vulnerabilities; the full-tree audit retained exactly the four accepted moderate findings below.

After the 2026-07-22 Next/sharp security patch, a fresh strict install again added 461 packages,
audited 462 packages, and reported only the four accepted moderate development findings below.
The live production audit reported zero vulnerabilities. The live full-tree audit reported exactly
those four moderate findings and exited successfully at the configured `high` threshold.
Remediation commit `c8f7c57` passed the same checks in hardened Ubuntu run `29975232336`.

The direct `esbuild@0.28.1` development pin satisfies Vite's optional peer contract and prevents
npm from incorrectly deduplicating Drizzle Kit's older `esbuild@0.25.12` into that slot.

## Accepted development-only advisory

`drizzle-kit@0.31.10` retains four moderate findings through its deprecated
`@esbuild-kit/esm-loader` dependency and an older esbuild development-server advisory.

Audit evidence on 2026-07-20: the production tree reported zero vulnerabilities; the full tree
reported exactly these four moderate findings and exited successfully at the configured `high`
threshold.

- Scope: local and CI schema tooling only; never part of the production dependency tree.
- Mitigations: Drizzle Studio and esbuild development servers must never be exposed; production
  audit blocks moderate or higher; full-tree audit blocks high or critical and still reports the
  exception.
- Expiry: 2026-09-30, or earlier when a stable Drizzle Kit release removes the legacy loader.
- Closure evidence: update the exact pin, regenerate the lockfile, and record clean production and
  full-tree audit output.

Do not use `npm audit fix --force`; dependency changes require an explicit exact-version review.

## Temporary Next image dependency override

Next was patched exactly from `16.2.10` to `16.2.11` after the hosted production audit identified
new Next advisories. Stable Next `16.2.11` still declares optional `sharp@^0.34.5`, which permits the
vulnerable `sharp@0.34.5` selected by npm. The mismatch is tracked in
[Next.js issue #96064](https://github.com/vercel/next.js/issues/96064); Next's
[sharp 0.35.3 update](https://github.com/vercel/next.js/pull/95507) has merged to canary but is not
in this stable package. The root therefore retains the existing Next-scoped PostCSS override and
adds an exact Next-scoped `sharp@0.35.3` override for
[GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj).

- Behavior enabled: keep Next's native image-optimizer path available while removing the known
  production advisory. `npm run test:next-sharp`, included in `npm run check`, asserts the single
  lockfile resolution, absence of a Sharp install script, Next's native load, libvips `8.18.3`, and
  an in-memory PNG transform with `sharp@0.35.3`. It passed locally and on Ubuntu in run
  `29975232336`.
- Smaller alternatives considered: the Next `16.2.11` patch alone still resolved to vulnerable sharp;
  retaining it would fail the production audit, while a top-level direct sharp dependency would
  unnecessarily widen the application's declared interface. The transitive, Next-scoped override
  is the narrowest lockfile-enforced repair.
- Maintenance and security posture: `sharp@0.35.3` is Apache-2.0 licensed and is the upstream fixed
  release named by the advisory. The lock resolves only sharp `0.35.3` and its matching native
  packages; sharp has no install script, and the root lifecycle-script denial remains in force.
- Compatibility risk: `0.35.3` is outside Next's declared `^0.34.5` range, so this is a reviewed
  temporary exception rather than evidence of upstream compatibility. The strict install, full
  local gate, production audit, full-tree audit, native image smoke, and hosted CI are required for
  every affected head; commit `c8f7c57` passes that complete local/hosted gate.
- Dependency-resolution footprint: `package.json` and `package-lock.json`; the reproducible
  compatibility check is `scripts/check-next-sharp-compat.mjs`. There is no product-source API or
  new external service. The production tree now uses Next `16.2.11` and sharp `0.35.3`;
  `eslint-config-next` remains `16.2.10` because this repair changes only the vulnerable runtime
  package.
- Removal trigger: remove the sharp override once a stable Next release declares `^0.35.3` or a
  later compatible range and that unoverridden graph passes the same strict install, audit, native
  image, local gate, and hosted CI checks.

## M0 Vercel Sandbox proof client

`@vercel/sandbox@2.8.0` is pinned as a development-only dependency for the disposable T004 cloud
boundary probe. It is Apache-2.0 licensed and maintained in Vercel's public `vercel/sandbox`
repository. It never enters the Next.js production dependency graph or browser bundle.

- Behavior enabled: create, inspect, stop, delete, and reconcile named ephemeral Vercel Sandboxes
  and snapshots while enforcing the provider-reported firewall and resource configuration.
- Smaller alternative considered: direct HTTP calls would duplicate an undocumented control-plane
  surface and make lifecycle cleanup less reliable. The official client is narrower than adding a
  general deployment CLI to the proof.
- Security posture: a fail-closed Python launcher reads the existing local Vercel credential only
  after owner/mode validation, resolves one fixed project, and passes the value only through the
  replacement process environment. Provider stderr and raw API bodies are never retained in proof
  output. Before name-scoped proof-resource reconciliation, it also requires the fixed project to
  be unlinked, environment-empty, deployment-empty, and free of non-proof Sandbox names. Any
  remaining created snapshot is treated as unowned and blocks cleanup rather than being deleted.
- Remaining proof-runtime risk: the disposable outer bootstrap currently installs Docker from the
  provider runtime's live `dnf` repository. The harness records the installed package and exact
  client/server versions and marks `docker_bootstrap_reproducible=false`, but this is not an
  owner-approved immutable dependency. Results remain feasibility-only until the Docker enforcement
  runtime is pinned by exact reviewed provenance or replaced with an immutable provider image.
- Footprint: lockfile and development/test tree only. The production audit remains clean; the full
  audit retains only the existing four moderate Drizzle Kit findings.
- Removal path: delete the proof client, launcher, contract test, and lockfile entries after the M0
  deployment boundary is selected and the evidence is archived, or replace it with the approved
  production platform client under a separately reviewed M1 decision.
