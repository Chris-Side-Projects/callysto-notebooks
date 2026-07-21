# Callysto continuation handoff

- Handoff prepared: **2026-07-20**
- Branch: `agent/m0-isolation-and-deployment-proofs`
- Starting commit: `a7b0d859933b932884986ea4442d61f95df5e2be`
- Baseline commit: `558a4cbd74e1ed02be7c0691220a5c64f8572cd5`
- Baseline merge: [PR #1](https://github.com/Chris-Side-Projects/callysto-notebooks/pull/1), merge commit `a7b0d859933b932884986ea4442d61f95df5e2be`
- Worktree: **published Milestone 0 proof branch; inspect status and remote state before new work**
- Authorized scope: **Milestone 0 / T001-T010 only**
- Product milestones M1-M8: **not authorized**

## Resume instruction

When the owner says **“let's continue”**, resume in
`/Users/christelles/Documents/Coding/EdTech/callysto-notebooks`, read this file, then follow the full
required reading order in [`AGENTS.md`](./AGENTS.md) through `CODING.md`. Inspect `git status` before
changing anything and preserve any later work. T001/T002 and the approved specification/mockup
baseline were merged to `main` by PR #1. The Ubuntu 24.04 baseline workflow passed. This branch now
contains the completed local T003 proof and expanded local T004 evidence and has owner authorization
to be published. Resume by checking the pushed branch and opening its review/hosted-CI path when
authorized, then close only the deployed/external M0 gates listed below; do not open M1 work.

## Why this project exists

Callysto addresses a review gap around computational claims: papers and conclusions may be public,
while the notebook that produced them is difficult to inspect, discuss at the exact cell, and revise
without losing review history. The pilot solution is a public, immutable notebook review record with
safe derived cells, exact cell anchors, contextual discussion, owner response, reviewer-controlled
resolution, and linked revised versions.

This is adjacent to open source and Git workflows, but it is **not** currently a Git interface or
“GitHub for data science.” The approved pilot has no repository synchronization, forks, votes, live
editing, notebook execution, or private workspaces. An early cohort study will choose exactly one
source path—direct `.ipynb` upload by default or GitHub exact-commit import if at least 80% of the
target notebooks already have a suitable GitHub workflow.

## Completed in this session and why

### Approval and specification lock

- Recorded owner approval of D001-D024 and T001-T010 on 2026-07-20.
- Rewrote the product, UX, architecture, security, test, and build documents around the narrow
  contextual-review loop so implementation cannot silently drift into a generic social notebook
  host.
- Preserved the M0 gate: no M1-M8 product code, deployment, or public launch is authorized.

### T001 baseline repair — complete locally

- Removed the conflicting `app/[user]/[slug]` tree and retained
  `app/[username]/[slug]`, requiring a visible `@` handle.
- Removed the duplicate `postcss.config.mjs` and retained `postcss.config.js`.
- Removed tracked `tsconfig.tsbuildinfo` and disabled TypeScript incremental output so a read-only
  typecheck does not recreate it.
- Added a repository-contract test for the canonical route, one PostCSS configuration, and no local
  TypeScript build-info artifact.
- Reworded and disabled scaffold controls so fictional data and unavailable auth/submission cannot
  be mistaken for working product behavior.

Why: the original scaffold could not build and advertised votes, forks, auth, upload, and rendering
behavior that the approved pilot either removed or has not implemented.

### T002 tooling baseline — complete locally and in hosted CI

- Pinned Node `24.18.0`, npm `11.16.0`, Python `3.14.6`, and exact JavaScript dependencies.
- Upgraded Next to `16.2.10`, React to `19.2.7`, Drizzle ORM to `0.45.2`, added Drizzle Kit, and
  removed unused `next-auth` v4.
- Added strict npm lifecycle-script denial. `esbuild`, `fsevents`, `sharp`, and `unrs-resolver`
  install scripts are denied; a new unreviewed lifecycle script makes `npm ci` fail.
- Added ESLint, Prettier, Vitest, Playwright, axe, doc-link validation, dependency audits, and a
  SHA-pinned GitHub Actions workflow.
- Hardened the workflow with a fixed Ubuntu 24.04 runner, non-persistent checkout credentials,
  explicit runtime assertions, and production-server browser execution under `CI`.
- Installed the pinned Playwright Chromium/Firefox builds in a disposable directory and passed the
  E2E, exact application-header, and automated accessibility baselines in both local-development and
  CI-equivalent production-server modes.
- Fixed two defects exposed by that browser run: encoded `@handle` route parameters incorrectly
  returned 404, and one homepage prompt had only 2.56:1 contrast.
- Documented the four accepted moderate development-only findings under Drizzle Kit. The production
  dependency tree has zero findings at moderate or higher.
- Baseline commit `558a4cb` passed the complete Ubuntu 24.04 `verify` workflow in 1m26s during PR #1.

Why: future product work needs a reproducible, enforceable gate; a passing build on one machine is
not enough, and dependency install scripts are a supply-chain boundary.

### T003 local content isolation proof — implemented; deployment proof pending

- Added a proof-only app shell and content gateway on distinct loopback hostnames, gated off unless
  `M0_PROOF_ENABLED=1`.
- Added strict per-request nonce CSP, empty-sandbox rich-output frames, exact no-store/content
  headers, and Ed25519 capabilities. The issuer has only the private key; the gateway has only the
  public key.
- Bound capabilities to exact proof/output/render revision/audience/expiry and exact preview draft
  generation; the gateway independently enforces canonical token shape, active authority, and the
  60/300-second maxima.
- Added hostile HTML/SVG, cookie/storage, form, popup, top-navigation, canary, tamper, lazy-load,
  expiry, restriction, and restoration cases in Chromium and Firefox.
- Added `npm run proof:m0` for a built local visual proof; a Playwright CLI inspection was completed.

Why: application-origin rendering of notebook-controlled rich content is the highest-impact browser
boundary. The local proof establishes the design without pretending loopback is a deployed content
domain or Cloudflare/R2 evidence.

### T004 local proof — expanded; deployment proof pending

- Clarified the exact binary `callysto-cell-id-v1` algorithm in `ARCHITECTURE.md`.
- Added normative Python/Node golden vectors, including Unicode, array/string source, ordinal/type,
  and the raw-digest-versus-ASCII-hex negative case.
- Added a standard-library default-deny converter proof that never executes notebook source, blocks
  active output, checks raster signatures and size limits, and produces deterministic manifests.
- Added a SQLite reference model proving lease-epoch and draft-generation fencing cases.
- Added a minimized converter launcher/child process with a constant environment, closed inherited
  descriptors, fixed local paths, canonical 0600 outputs, path-free errors, and a sentinel notebook
  that would read secrets/write/network if source were ever executed.
- Added a real PostgreSQL 17.9 proof for database-clock leases, `FOR UPDATE SKIP LOCKED`, concurrent
  workers, random tokens, monotonic generations, expiry/reclaim, stale completion, idempotent exact
  duplicate completion, and active-upload/draft replacement fencing.
- Added a digest-pinned PostgreSQL service and proof step to CI; hosted execution requires a pull
  request because this workflow runs branch pushes only on `main`.

Why: cell anchors and stale-worker rejection must be deterministic before review records or render
state are persisted. PostgreSQL semantics and child-process minimization are now real local
evidence; OS/container no-network enforcement, Railway, R2, and orchestrator egress are not.

### Cloud and external-gate audit — complete read-only inventory

- Confirmed GitHub repository/Actions, Railway, and Vercel account access, but found no Callysto
  environment, service, deployment, or project on any of them.
- Confirmed no GitHub environments/deployments/Actions secrets or variables and no Pages site.
- Located a root-only Cloudflare/R2 credential bundle on the configured VPS and used it in place,
  without copying secret values. Token verification plus read-only R2, Workers, and zone inventory
  succeeded; no Callysto-named resource exists. Write scope was not tested, and the existing single
  R2 identity does not satisfy the required primary/recovery separation.
- Confirmed `callysto.io` is parked and `staging.callysto.io` has no application DNS record.
- Recorded exact T005-T010 participant, provider, recovery, and policy inputs without fabricating
  people, credentials, services, or legal decisions.

Why: a green local app or domain registration is not deployment evidence. Creating a generic cloud
service would not close the required converter-egress/content-host/recovery boundaries.

### T009 mockups — owner approved

- Added dependency-free responsive mockups for the homepage, desktop notebook review, mobile inline
  discussion, and draft processing/failure states under [`docs/design/m0`](./docs/design/m0/).
- Removed fake engagement, labeled every fixture as `Product demonstration`, and made mutation
  controls disabled/read-only.
- Static structure, contrast, and product-honesty checks passed; lowest tested contrast was 4.97:1.
- The owner approved all ten review items without amendment on 2026-07-20; D024 records the visual
  reference and its boundary.

Why: the accepted plan requires visual approval before production UI work. That gate is now closed,
while the legacy scaffold remains outside the approved visual reference.

## Validation captured on 2026-07-20

Environment labels matter:

- Exact Node `24.18.0` / npm `11.16.0`: locally verified from a checksum-verified official archive.
- Exact Python `3.14.6`: locally verified with the SHA-verified macOS arm64 Astral portable build; all
  30 Python proof cases and the independent Node vector consumer passed.
- Clean disposable `npm ci`: passed with 443 packages, no dependency lifecycle script executed, and
  no unreviewed scripts pending.
- Dependency tree: `npm ls` passed for the native/build-tool branches.
- Current branch component checks: 18 unit cases, 3 repository-contract integration cases, 30
  Python cases, the independent Node cell-ID vectors, 4 PostgreSQL 17.9 fencing cases, and the
  29-file documentation contract pass locally. The final canonical `npm run check` passed after
  implementation and evidence reconciliation.
- Baseline clean-install copy: the then-current baseline checks passed; the first sandboxed build was
  denied permission to bind a local port, then the exact baseline build passed with that permission.
  This is not claimed as a clean-copy run of the later proof-branch changes.
- Production audit: zero vulnerabilities.
- Full audit: four moderate development-only Drizzle Kit/esbuild findings; accepted temporarily in
  [`docs/DEPENDENCY_RISKS.md`](./docs/DEPENDENCY_RISKS.md).
- Local Playwright baseline: **pass** in development and CI-equivalent production-server modes—2
  Chromium E2E tests, 6 exact header tests across Chromium/Firefox, 8 hostile/capability cases across
  Chromium/Firefox (14 security cases total), and 4 Chromium axe smoke tests.
- The axe result is an automated serious/critical smoke baseline through WCAG 2.2 tags, not a claim
  of full WCAG conformance; manual accessibility evidence remains required.
- GitHub Actions: **pass** for baseline commit `558a4cb` in
  [workflow run 29780426457](https://github.com/Chris-Side-Projects/callysto-notebooks/actions/runs/29780426457).
- Staging/production/provider/real-user evidence: **none**.

Detailed local evidence is in [`docs/evidence/M0.2-M0.4.md`](./docs/evidence/M0.2-M0.4.md),
[`docs/evidence/M0.5.md`](./docs/evidence/M0.5.md), [`docs/evidence/M0.6.md`](./docs/evidence/M0.6.md),
and [`docs/evidence/M0-cloud-and-external-gates.md`](./docs/evidence/M0-cloud-and-external-gates.md).

## Exact next sequence and why

1. **Open the review path and run hosted CI.** The branch is published, but the workflow runs branch
   pushes only on `main`; a pull request must pass the new digest-pinned PostgreSQL service and
   14-case Chromium/Firefox proof on Ubuntu. Local success is not hosted evidence.
2. **Establish the missing staging boundary.** Retain the shared VPS bundle for read-only inventory;
   create Callysto-specific least-privilege Cloudflare and separately scoped primary/recovery R2
   credentials before provisioning. Select a deployment technique that can actually deny converter
   network/metadata access and restrict the orchestrator to PostgreSQL/R2. If Railway cannot enforce
   this, invoke D013 instead of deploying a misleading generic service.
3. **Collect owner-supplied external inputs.** T005 needs 6-10 named candidates and at least 8 real
   notebooks; T006 then proves only the selected ingestion path. T007/T008 need the provider and
   recovery inputs enumerated in the cloud-gate evidence. T010 needs legal/policy owners/deadlines.
4. **Run disposable staging proofs.** Only after step 2: content hostname/cookies/cache/revocation,
   converter/orchestrator egress, selected-source R2 promotion, identity/contact, and recovery.
5. **Reconcile the M0 gate.** Only after every M0 acceptance item has environment-labeled evidence
   should the owner review whether to authorize M1.

## Restart commands

No compatible version manager was present on this Mac. Recreate the checksum-verified disposable
toolchain with the checked-in bootstrap, then select it for this shell:

```bash
cd /Users/christelles/Documents/Coding/EdTech/callysto-notebooks
./scripts/bootstrap-macos-arm64-runtimes.sh
export PATH="/private/tmp/callysto-runtime-v24.18.0-py3.14.6/node/bin:/private/tmp/callysto-runtime-v24.18.0-py3.14.6/python/bin:/usr/bin:/bin"
git status --short
node --version
npm --version
python3 --version
npm ci
npm run audit:prod
npm run audit:all
npm run check
export PLAYWRIGHT_BROWSERS_PATH="/private/tmp/callysto-runtime-v24.18.0-py3.14.6/playwright-browsers"
npm run browser:install
npm run test:e2e
npm run test:security
npm run test:a11y
git diff --check
```

The PostgreSQL proof is intentionally not part of ordinary `npm run check` because it refuses to
run without a dedicated loopback database. These are the exact macOS commands used with PostgreSQL
17.9; the final command stops the disposable server. Choose a free loopback port if `55439` is in
use, and preserve the generated directory until the stop command succeeds:

```bash
export CALLYSTO_PG_BIN="/usr/local/bin"
export CALLYSTO_PG_PORT="55439"
export CALLYSTO_PG_PROOF_DIR="$(mktemp -d /private/tmp/callysto-pg-proof.XXXXXX)"
"$CALLYSTO_PG_BIN/initdb" -D "$CALLYSTO_PG_PROOF_DIR/data" --no-locale --encoding=UTF8
"$CALLYSTO_PG_BIN/pg_ctl" -D "$CALLYSTO_PG_PROOF_DIR/data" \
  -l "$CALLYSTO_PG_PROOF_DIR/postgres.log" \
  -o "-h 127.0.0.1 -p $CALLYSTO_PG_PORT" start
"$CALLYSTO_PG_BIN/createdb" -h 127.0.0.1 -p "$CALLYSTO_PG_PORT" callysto_m0_proof
export CALLYSTO_TEST_DATABASE_URL="postgresql://127.0.0.1:$CALLYSTO_PG_PORT/callysto_m0_proof"
npm run test:postgres:proof
"$CALLYSTO_PG_BIN/pg_ctl" -D "$CALLYSTO_PG_PROOF_DIR/data" stop -m fast
```

The Codex filesystem sandbox may deny PostgreSQL shared-memory allocation during `initdb`; if so,
rerun this disposable proof with narrowly approved outside-sandbox execution. The recipe above was
replayed successfully on 2026-07-20 and ended with `POSTGRES_STOPPED=yes`.

After `npm run build`, `npm run proof:m0` starts the gated visual proof at
`http://127.0.0.1:3100/m0/isolation-proof?proof=manual`. Stop it with Ctrl-C.
The final manual smoke returned HTTP 200 from the application, HTTP 204 from both the direct and
advertised content-gateway health endpoints, and a refused connection for the unsafe
`127.0.0.1:3101` app-host alias. The harness was then stopped.

Expected versions: Node `v24.18.0`, npm `11.16.0`, Python `3.14.6`. Do not use
`npm audit fix --force`. Do not add Auth.js, storage, database, or provider dependencies until their
specific M0 task requires them.

## Restart-safe state

- No server, browser, watcher, or database was intentionally left running.
- Temporary runtimes and browser binaries are under `/private/tmp` and may disappear on restart;
  their exact URLs/checksums are encoded in `scripts/bootstrap-macos-arm64-runtimes.sh`, not treated
  as hidden project inputs.
- Git HTTPS remote access, Railway authentication, and Vercel authentication were verified; no token
  or credential is stored in the repository or documentation. The stored GitHub CLI token reported
  invalid during the publication check, so `gh` API operations require reauthentication even though
  Git remote access works. A root-only VPS Cloudflare bundle was verified in place for read-only
  inventory; no secret value was copied locally, its write scope was not tested, and it is not yet a
  Callysto-specific staging credential set.
- Baseline commit `558a4cb` and hosted-CI evidence commit `bdcca47` were merged through PR #1 as
  `a7b0d85`. This proof branch is committed and pushed separately from `main`; it is not merged or
  hosted-CI verified until a pull request runs successfully. No deployment, migration, provider
  configuration, public launch, or external outreach occurred.
- The pre-final-check ignored `.next` cache was moved intact to
  `/private/tmp/callysto-next-cache-20260720-172458`; it is disposable and not part of the project.
- A later generated `.next` cache that accumulated numbered file-provider conflict copies was moved
  intact to `/private/tmp/callysto-next-cache-20260720-191200`. The final gate then passed from a
  clean generated-cache state; this second cache is also disposable and outside the project.
- Thirty-two older untracked filename-conflict copies (for example `PRODUCT_SPEC 2.md`) were moved,
  not deleted, to the ignored `output/recovered-conflict-copies/` tree. Canonical filenames contain
  the current work; retain that recovery tree until the owner no longer needs the historical copies.
