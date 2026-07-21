# Dependency risk register

- Status: **MILESTONE 0 ACTIVE**
- Last reviewed: 2026-07-21
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
