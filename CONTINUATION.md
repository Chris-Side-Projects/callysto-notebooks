# Callysto continuation handoff

- Handoff prepared: **2026-07-22**
- Branch: `agent/m0-isolation-and-deployment-proofs`
- Starting commit: `a7b0d859933b932884986ea4442d61f95df5e2be`
- Baseline commit: `558a4cbd74e1ed02be7c0691220a5c64f8572cd5`
- Validated proof commit: `48805ccefd7fa9fb600ac8c8daa75587ff0a8aca`
- Strengthened provider-proof invocation base: `c2cdbac2f4f0d4cb0155941f29b8e76a5360f206`
- Provider-proof hardening commit: `f03de012526520ada807523f3177c32d1a953a76`
- Pre-remediation branch head: `caee50b5908fe3e5a316b416239fca4910474dd7`
- Strengthened provider-proof harness SHA-256:
  `3da94b2033bd4556a0eb49586c22c30ff85f9efd6289e73aba4745c3deac27d3`
- Hosted validation: [Ubuntu run 29846200710](https://github.com/Chris-Side-Projects/callysto-notebooks/actions/runs/29846200710)
- Pre-remediation hosted failure: [Ubuntu run 29972476045](https://github.com/Chris-Side-Projects/callysto-notebooks/actions/runs/29972476045) — production dependency audit only
- Baseline merge: [PR #1](https://github.com/Chris-Side-Projects/callysto-notebooks/pull/1), merge commit `a7b0d859933b932884986ea4442d61f95df5e2be`
- Worktree: **approved dependency-remediation tree is local-green but uncommitted; inspect status and remote state before new work**
- Authorized scope: **Milestone 0 / T001-T010 only**
- Product milestones M1-M8: **not authorized; M1 is NO-GO**

## Resume instruction

When the owner says **“let's continue”**, resume in
`/Users/christelles/Documents/Coding/EdTech/callysto-notebooks`, read this file, then follow the full
required reading order in [`AGENTS.md`](./AGENTS.md) through `CODING.md`. Inspect `git status` before
changing anything and preserve any later work. T001/T002 and the approved specification/mockup
baseline were merged to `main` by PR #1. PR #2 proof head `48805cc` passed the 2026-07-21 local gate,
audits, and hardened Ubuntu 24.04 workflow in run `29846200710`. The PR remains draft and unmerged.
The owner-approved strengthened Vercel converter replay passed on 2026-07-22 and was independently
reconciled to zero ephemeral Sandbox/snapshot resources. A later branch head, `caee50b`, failed
hosted run `29972476045` only because newly published Next.js/Sharp advisories made the production
audit red. The owner approved the narrow dependency remediation now present in the working tree:
Next.js `16.2.11` plus a temporary Next-scoped exact `sharp@0.35.3` override. Its strict clean
install, live audits, dependency-tree assertion, complete local core/browser/PostgreSQL gate, and
image-optimizer smoke have passed locally; hosted CI for the eventual committed head is still
pending. Resume with step 1 below. Do not merge without a new owner request and do not open M1 work.
The current M0 decision is NO-GO.

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

### T002 tooling baseline — accepted baseline; remediation local-green and hosted-CI pending

- Pinned Node `24.18.0`, npm `11.16.0`, Python `3.14.6`, and exact JavaScript dependencies.
- Initially upgraded Next to `16.2.10`, React to `19.2.7`, Drizzle ORM to `0.45.2`, added Drizzle
  Kit, and removed unused `next-auth` v4. The approved remediation working tree patches the Next
  runtime to `16.2.11`; `eslint-config-next` remains `16.2.10` because no lint-config change is
  needed for the production advisory.
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
- Pre-remediation branch head `caee50b` later failed hosted run `29972476045` at the production
  audit because new Next.js and transitive Sharp advisories affected the previously green lockfile.
  The approved working-tree repair uses exact Next.js `16.2.11` and a temporary Next-scoped exact
  `sharp@0.35.3` override because the stable Next.js package still declares `sharp` as `^0.34.5`.
  A strict clean `npm ci` added 461 packages and audited 462, the live production audit returned
  zero findings, the live full audit returned exactly the four accepted moderate development-only
  Drizzle Kit findings, `npm ls sharp` resolved only `0.35.3`, and the image-optimizer smoke passed.
  Remove the Sharp override only after a stable Next.js release declares a patched Sharp range and
  a clean install resolves `sharp>=0.35.3` without the override while the live audits, optimizer
  smoke, full local gate, and hosted CI remain green.

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

### T004 converter/orchestrator proof — partial local and strengthened provider evidence

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
- Ran the owner-approved strengthened converter feasibility slice in ephemeral Vercel Sandbox
  compute. The deterministic hostile fixture, non-execution marker, no-network canary, isolation,
  and resource-limit matrix slice passed in the minimized nested converter container.
- The provider result reported converter, bootstrap, and snapshot cleanup complete. An independent
  post-run reconciliation then found zero proof Sandboxes and zero proof snapshots.
- The successful invocation used base commit
  `c2cdbac2f4f0d4cb0155941f29b8e76a5360f206` plus the working-tree launcher/harness hardening,
  bound by harness SHA-256
  `3da94b2033bd4556a0eb49586c22c30ff85f9efd6289e73aba4745c3deac27d3`.
- Commit `f03de012526520ada807523f3177c32d1a953a76` subsequently captured the hardening. It
  contains the exact harness/launcher bytes; only the non-transmitted cleanup helper received a
  Prettier-only reflow after execution, recorded with both digests in the provider evidence file.
- The outer Sandbox still connected to the link-local metadata address over TCP. Inner Docker
  `--network none` blocked that route, but this failed the required outer metadata-denial assertion.
- Rejected Vercel Sandbox as the credential-bearing orchestrator boundary. The live `dnf`
  bootstrap is mutable, so even the passing strengthened converter slice is feasibility evidence,
  not security certification. The exact DB/R2-only orchestrator, content/R2, recovery, and remaining
  failure/retry/integrated matrix are open, so T004 is not complete.
- Diagnosed two pre-run local reconciliation exits with code 137 as macOS `EXC_GUARD`: the launcher
  used `os.closerange` and attempted to close Codex's guarded inherited descriptor 3. The launcher
  now marks inherited descriptors close-on-exec, and Sandbox/snapshot pagination is bounded and
  time-limited. Regression tests cover both repairs.

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
- Pre-remediation head `caee50b` passed formatting, lint, typecheck, 18 unit, 21
  integration, 42 Python plus shared vectors, the 35-document contract, and the production build.
  The build required its known outside-sandbox loopback allowance. The unchanged lockfile retains
  the separately recorded strict-install and online-audit evidence; current offline audits also pass.
- Branch head `caee50b` preserved that local evidence but failed
  [hosted run 29972476045](https://github.com/Chris-Side-Projects/callysto-notebooks/actions/runs/29972476045)
  at the production audit after new Next.js/Sharp advisories appeared. The approved dependency
  remediation now has a passing strict clean install, zero-finding live production audit, exactly
  four accepted moderate development-only findings in the live full audit, one resolved
  `sharp@0.35.3`, and a passing `npm run test:next-sharp` native image-optimizer smoke with libvips
  `8.18.3`. The remediated local gate also passes formatting, lint, typecheck, 18 unit, 21
  integration, 42 Python plus shared
  vectors, the 35-document contract, and the Next.js `16.2.11` production build. The dedicated
  PostgreSQL 17.9 proof passes 4/4 and stopped cleanly; production E2E passes 2/2 in Chromium,
  security passes 14/14 across Chromium and Firefox, and accessibility passes 4/4 in Chromium.
  Hosted CI for the eventual committed remediation head is not yet verified.
- The 2026-07-22 disposable Vercel replay passed the deterministic hostile-fixture,
  non-execution/canary, isolation, and resource-limit converter slice and cleaned/reconciled all
  ephemeral resources. It remains feasibility-only because its live `dnf` bootstrap is mutable.
  The failed outer metadata-denial assertion and unselected orchestrator boundary prevent a complete
  T004 claim.
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

1. **Finish and host-validate the approved dependency remediation.** Historical proof head
   `48805cc` retains its complete hosted gate in run `29846200710`; pre-remediation head `caee50b`
   failed run `29972476045` only at the newly red production audit. The complete remediated local
   core/browser/PostgreSQL gate now passes on exact Next.js `16.2.11` plus the temporary Next-scoped
   `sharp@0.35.3` override. Review the diff, commit and push the exact tree, then require a green
   hosted run for that committed head. Keep `eslint-config-next@16.2.10`. Do not merge PR #2 without
   a new owner request. Remove the Sharp override only when a stable Next.js release declares a
   patched Sharp range and a clean no-override install, live audits, optimizer smoke, full local
   gate, and hosted CI all pass.
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

The owner's one-run approval to transmit the pinned proof image, public harness, and synthetic
hostile notebook fixture to Vercel was consumed by the successful 2026-07-22 replay. It did not
authorize a live application deployment or the rejected secret-bearing orchestrator mode. Any
future metered replay requires fresh explicit authority.

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

The only approved replay surface for a bounded Vercel proof is the checked-in Python wrapper. It
validates the fixed runtime and credential boundary without requiring a copied or printed
`VERCEL_TOKEN`. Replays are metered external actions and require fresh explicit authority; the
approval used on 2026-07-22 is consumed. The converter mode also requires the expected image archive at
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
The wrapper refuses a linked, environment-bearing, or deployment-bearing proof project. It marks
inherited descriptors close-on-exec instead of explicitly closing Codex's guarded descriptors.
Reconcile mode uses bounded, time-limited pagination and removes only exact-name proof Sandboxes and
their name-filtered snapshots. If a created
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
export CALLYSTO_PG_BIN="/usr/local/opt/postgresql@17/bin"
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

Do not substitute `/usr/local/bin` on this machine: it currently resolves PostgreSQL `16.13`, not
the required `17.9` proof runtime.

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
  running. Local listeners on ports `3100`, `3101`, and `55439` are absent; the PostgreSQL proof
  ended with `POSTGRES_STOPPED=yes`. The strengthened provider result reported
  converter/bootstrap/snapshot cleanup complete, and the independent post-run reconciliation found
  zero Sandbox and zero snapshot resources.
- Temporary runtimes and browser binaries are under `/private/tmp` and may disappear on restart;
  their exact URLs/checksums are encoded in `scripts/bootstrap-macos-arm64-runtimes.sh`, not treated
  as hidden project inputs.
- Git HTTPS remote access and Vercel account access were verified; no token or credential is stored
  in the repository or documentation. The global `use-vps-secrets-safely` skill and
  [`docs/VPS_CREDENTIAL_HANDOFF.md`](./docs/VPS_CREDENTIAL_HANDOFF.md) are the restart authority for
  credential work. The earlier shared Cloudflare token is rejected; dedicated Cloudflare and
  separate primary/recovery R2 identities have not been supplied. Railway spend authority and a
  dedicated project credential are also absent.
- Pre-remediation head `caee50b` retained the strengthened tree's complete local core-gate result,
  but hosted run `29972476045` failed its production audit after new Next.js/Sharp advisories were
  published. The approved dependency-remediation working tree now uses Next.js `16.2.11` and the
  temporary Next-scoped exact `sharp@0.35.3` override; `eslint-config-next` remains `16.2.10`. Its
  strict clean `npm ci` added 461 packages and audited 462, the live production audit is zero, the
  live full audit is exactly the four accepted moderate development-only findings, the tree contains
  only `sharp@0.35.3`, and the native image-optimizer smoke passes with libvips `8.18.3`. The complete
  local gate passes: formatting, lint, typecheck, 18 unit, 21 integration, 42 Python plus vectors,
  35-document contract, Next.js `16.2.11` production build, PostgreSQL 17.9 proof 4/4 with clean
  shutdown, production Chromium E2E 2/2, Chromium/Firefox security 14/14, and Chromium accessibility
  4/4. Hosted CI for the eventual committed head remains pending; do not merge before it passes.
- Baseline commit `558a4cb` and hosted-CI evidence commit `bdcca47` were merged through PR #1 as
  `a7b0d85`. PR #2 proof head `48805cc` passed hosted run `29846200710`; the PR remains draft and
  unmerged. No live application, integrated staging,
  production environment, migration, public launch, or external outreach exists. The only
  persistent new cloud record is the empty, unlinked `callysto-m0-proof` Vercel project; no
  Cloudflare Worker/R2 or Railway resource exists.
- External T005, T007, and T010 inputs remain absent. The strengthened but feasibility-only Vercel
  converter matrix slice, local Worker contract, and earlier local proofs do not close T004 or the
  M0 gate. M1 remains NO-GO.
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
