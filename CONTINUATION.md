# Callysto continuation handoff

- Handoff prepared: **2026-07-21**
- Branch: `agent/m0-isolation-and-deployment-proofs`
- Starting commit: `a7b0d859933b932884986ea4442d61f95df5e2be`
- Baseline commit: `558a4cbd74e1ed02be7c0691220a5c64f8572cd5`
- Validated proof commit: `48805ccefd7fa9fb600ac8c8daa75587ff0a8aca`
- Hosted validation: [Ubuntu run 29846200710](https://github.com/Chris-Side-Projects/callysto-notebooks/actions/runs/29846200710)
- Baseline merge: [PR #1](https://github.com/Chris-Side-Projects/callysto-notebooks/pull/1), merge commit `a7b0d859933b932884986ea4442d61f95df5e2be`
- Worktree: **published Milestone 0 proof branch; inspect status and remote state before new work**
- Authorized scope: **Milestone 0 / T001-T010 only**
- Product milestones M1-M8: **not authorized; M1 is NO-GO**

## Resume instruction

When the owner says **“let's continue”**, resume in
`/Users/christelles/Documents/Coding/EdTech/callysto-notebooks`, read this file, then follow the full
required reading order in [`AGENTS.md`](./AGENTS.md) through `CODING.md`. Inspect `git status` before
changing anything and preserve any later work. T001/T002 and the approved specification/mockup
baseline were merged to `main` by PR #1. PR #2 proof head `48805cc` passed the 2026-07-21 local gate,
audits, and hardened Ubuntu 24.04 workflow in run `29846200710`. The PR remains draft and unmerged.
Resume at the remaining deployed/external M0 gates below; do not merge without a new owner request
and do not open M1 work. The current M0 decision is NO-GO.

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

### T003 content isolation proof — local implementation and Worker contract only

- Added a proof-only app shell and content gateway on distinct loopback hostnames, gated off unless
  `M0_PROOF_ENABLED=1`.
- Added strict per-request nonce CSP, empty-sandbox rich-output frames, exact no-store/content
  headers, and Ed25519 capabilities. The issuer has only the private key; the gateway has only the
  public key.
- Bound v2 capabilities to exact proof/output/render revision/content-index digest/audience/expiry
  and exact preview draft generation; the issuer and gateway share `/v0/outputs/:id`, and the
  gateway independently enforces canonical token/index shape, duplicate-key rejection, active
  authority, exact index bytes, and gateway-current-time 60/300-second maxima.
- Added hostile HTML/SVG, cookie/storage, form, popup, top-navigation, canary, tamper, lazy-load,
  expiry, restriction, and restoration cases in Chromium and Firefox.
- Added `npm run proof:m0` for a built local visual proof; a Playwright CLI inspection was completed.

Why: application-origin rendering of notebook-controlled rich content is the highest-impact browser
boundary. The local proof and local Cloudflare Worker contract establish the design without
pretending loopback is a deployed content domain or Cloudflare/R2 provider evidence.

### T004 converter/orchestrator proof — partial local and provider evidence

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
- Added a digest-pinned PostgreSQL service and proof step to CI; it passes on PR #2 proof head
  `48805cc` in hosted run `29846200710`.
- Ran one bounded happy-path converter feasibility slice in ephemeral Vercel Sandbox compute with a
  minimized nested converter container; the proof Sandbox and snapshot were cleaned afterward.
- The outer Sandbox still connected to the link-local metadata address over TCP. Inner Docker
  `--network none` blocked that route, but this failed the required outer metadata-denial assertion.
- Rejected Vercel Sandbox as the credential-bearing orchestrator boundary. The full hostile,
  resource-limit, timeout, partial-write, failure, retry, content/R2, and recovery matrix remains
  open, so T004 is not complete.

Why: cell anchors and stale-worker rejection must be deterministic before review records or render
state are persisted. PostgreSQL semantics and child-process minimization are real local evidence,
and the provider run is a bounded converter feasibility result only. It is not integrated staging,
an application deployment, or proof of the orchestrator/content/R2/recovery boundaries.

### Cloud and external-gate reconciliation — inventory complete, proof gates open

- Confirmed GitHub repository/Actions, Railway, and Vercel account access. No live Callysto
  application is deployed. The only persistent new control-plane record is an empty, unlinked
  Vercel project named `callysto-m0-proof`; all ephemeral Sandboxes, snapshots, and accidental proof
  deployments were cleaned.
- Confirmed no GitHub environments/deployments/Actions secrets or variables and no Pages site.
- An earlier shared Cloudflare/R2 credential on the VPS was used in place for read-only inventory,
  without copying secret values, but it is now rejected and is not a Callysto management identity.
  No Cloudflare Worker, primary/recovery R2 bucket, Railway service/database, integrated staging
  environment, or production environment exists.
- Confirmed `callysto.io` is parked and `staging.callysto.io` has no application DNS record.
- Recorded exact T005-T010 participant, provider, recovery, and policy inputs without fabricating
  people, credentials, services, or legal decisions. The external inputs required by T005, T007,
  and T010 remain absent.

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

## Validation evidence and current gate

Environment labels matter. The counts below are evidence for their named commits:

- Baseline commit `558a4cb` passed exact runtime, clean install, audits, local core/browser checks,
  and [Ubuntu workflow run 29780426457](https://github.com/Chris-Side-Projects/callysto-notebooks/actions/runs/29780426457).
- PR #2 proof head `48805cc` passed the reconciled gate in
  [Ubuntu workflow run 29846200710](https://github.com/Chris-Side-Projects/callysto-notebooks/actions/runs/29846200710):
  18 unit, 19 integration, 41 Python, 35-document, four PostgreSQL, two Chromium E2E, 14
  Chromium/Firefox security, and four Chromium accessibility cases plus audits and production build.
- The disposable Vercel provider run verifies only one converter happy path under the documented
  nested-container limits. The failed outer metadata-denial assertion and unselected orchestrator
  boundary prevent a complete T004 claim.
- The local Cloudflare Worker tests are contract evidence, not a deployed content hostname or R2
  integration.
- No integrated staging, production, provider-backed content/R2, real-user, or recovery evidence
  exists. M1 remains NO-GO.

Detailed evidence is in [`docs/evidence/M0.2-M0.4.md`](./docs/evidence/M0.2-M0.4.md),
[`docs/evidence/M0.5.md`](./docs/evidence/M0.5.md), [`docs/evidence/M0.6.md`](./docs/evidence/M0.6.md),
[`docs/evidence/M0-vercel-sandbox-converter.md`](./docs/evidence/M0-vercel-sandbox-converter.md),
[`docs/evidence/M0-hosted-CI-PR2.md`](./docs/evidence/M0-hosted-CI-PR2.md), and
[`docs/evidence/M0-gate-reconciliation.md`](./docs/evidence/M0-gate-reconciliation.md).

## Exact next sequence and why

1. **Preserve the green draft-PR boundary.** Proof head `48805cc` passes the complete local and
   hosted gate in run `29846200710`. Do not merge PR #2 without a new owner request; rerun the gate
   after any later change and keep evidence environment-labeled.
2. **Create dedicated Cloudflare identities securely.** Supply a least-privilege Callysto management
   token plus separately scoped primary and recovery R2 identities through the VPS hidden-prompt
   handoff. Do not reuse the rejected shared token or disclose values to Codex output.
3. **Provision the Cloudflare/R2 proof boundary.** Once those identities exist, create only the
   approved proof Worker, content hostname, and separate primary/recovery R2 resources; then run the
   content, cookie, cache, revocation, promotion, and recovery cases.
4. **Select a metadata-safe orchestrator platform.** Vercel Sandbox is not accepted for the
   credential-bearing orchestrator because its outer metadata route was reachable. Do not claim
   Railway compute or ordinary Vercel hosting closes this boundary without the required evidence.
5. **Establish the database/recovery provider gate.** Obtain explicit Railway spend authority and a
   dedicated credential, provision only the approved disposable database target, and prove PITR and
   restore before treating it as staging evidence.
6. **Collect the missing external inputs.** T005 needs 6-10 named candidates and at least 8 real
   notebooks; T007 needs selected provider/contact inputs; T010 needs legal/policy owners and dates.
   T006/T008 may proceed only from those named upstream choices.
7. **Reconcile the complete M0 gate.** Run the remaining hostile/limit/failure, integrated staging,
   identity/contact, recovery, and manual evidence. The owner may consider M1 only after every M0
   acceptance item has environment-labeled proof; until then M1 remains NO-GO.

The strengthened Vercel converter replay is locally ready but crosses an external-upload gate. Do
not run it until the owner explicitly authorizes transmitting the pinned proof image, public
harness, and synthetic hostile notebook fixture to Vercel. That approval does not authorize a live
application deployment or the rejected secret-bearing orchestrator mode.

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

### Secure provider-proof wrapper

The only approved replay surface for the bounded Vercel proof is the checked-in Python wrapper. It
validates the fixed runtime and credential boundary without requiring a copied or printed
`VERCEL_TOKEN`. Replays are metered external actions and require explicit authority. The converter
mode also requires the expected image archive at
`/private/tmp/callysto-m0-converter-image.tar.gz`.

```bash
python3 scripts/run-m0-vercel-sandbox-proof.py converter \
  --accept-metered-proof \
  --project-name callysto-m0-proof \
  --team-slug chris-projects-e21d5700
python3 scripts/run-m0-vercel-sandbox-proof.py reconcile \
  --accept-metered-proof \
  --project-name callysto-m0-proof \
  --team-slug chris-projects-e21d5700
```

Do not replay the orchestrator mode until a provider and exact egress/metadata targets are approved.
Do not set or print provider-token environment variables manually.
The wrapper refuses a linked, environment-bearing, or deployment-bearing proof project. Reconcile
mode removes only exact-name proof Sandboxes and their name-filtered snapshots. If a created
snapshot remains without an owned proof Sandbox, reconciliation reports it and refuses to delete
it; do not run another Sandbox job in that project concurrently. The current live
`dnf` Docker bootstrap is recorded as feasibility-only and cannot support a security-certification
claim until its enforcement runtime is immutably pinned and approved.

### Secure Cloudflare credential handoff

Use the global `use-vps-secrets-safely` skill and the exact root-only hidden-prompt procedure in
[`docs/VPS_CREDENTIAL_HANDOFF.md`](./docs/VPS_CREDENTIAL_HANDOFF.md). Paste the token **only after**
the terminal displays `Callysto Cloudflare token:`. The hidden `read -s` prompt displays no
characters. Never paste the token into the script text, command history, repository, chat, or in
place of the literal `$CALLYSTO_CF_TOKEN` variable reference.

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

- No server, browser, watcher, database, Vercel Sandbox, or proof process was intentionally left
  running. Every ephemeral provider-proof Sandbox and snapshot was cleaned.
- Temporary runtimes and browser binaries are under `/private/tmp` and may disappear on restart;
  their exact URLs/checksums are encoded in `scripts/bootstrap-macos-arm64-runtimes.sh`, not treated
  as hidden project inputs.
- Git HTTPS remote access and Vercel account access were verified; no token or credential is stored
  in the repository or documentation. The global `use-vps-secrets-safely` skill and
  [`docs/VPS_CREDENTIAL_HANDOFF.md`](./docs/VPS_CREDENTIAL_HANDOFF.md) are the restart authority for
  credential work. The earlier shared Cloudflare token is rejected; dedicated Cloudflare and
  separate primary/recovery R2 identities have not been supplied. Railway spend authority and a
  dedicated project credential are also absent.
- The 2026-07-21 reconciled working tree passes strict `npm ci` (461 packages, no lifecycle
  scripts), zero-finding production audit, the accepted four-moderate full audit, formatting, lint,
  typecheck, 18 unit, 19 integration, 41 Python, 35-document, and production-build checks.
- Baseline commit `558a4cb` and hosted-CI evidence commit `bdcca47` were merged through PR #1 as
  `a7b0d85`. PR #2 proof head `48805cc` passed hosted run `29846200710`; the PR remains draft and
  unmerged. No live application, integrated staging,
  production environment, migration, public launch, or external outreach exists. The only
  persistent new cloud record is the empty, unlinked `callysto-m0-proof` Vercel project; no
  Cloudflare Worker/R2 or Railway resource exists.
- External T005, T007, and T010 inputs remain absent. The bounded Vercel converter happy path, local
  Worker contract, and earlier local proofs do not close T004 or the M0 gate. M1 remains NO-GO.
- The pre-final-check ignored `.next` cache was moved intact to
  `/private/tmp/callysto-next-cache-20260720-172458`; it is disposable and not part of the project.
- A later generated `.next` cache that accumulated numbered file-provider conflict copies was moved
  intact to `/private/tmp/callysto-next-cache-20260720-191200`. The final gate then passed from a
  clean generated-cache state; this second cache is also disposable and outside the project.
- The generated local `.vercel` link/build output was moved intact to
  `/private/tmp/callysto-vercel-generated-20260721-1052` before the final gate. It is recoverable,
  ignored, contains no authoritative project source, and no `.vercel` link remains in the checkout.
- Thirty-two older untracked filename-conflict copies (for example `PRODUCT_SPEC 2.md`) were moved,
  not deleted, to the ignored `output/recovered-conflict-copies/` tree. Canonical filenames contain
  the current work; retain that recovery tree until the owner no longer needs the historical copies.
