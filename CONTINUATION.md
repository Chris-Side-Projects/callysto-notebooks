# Callysto continuation handoff

- Handoff prepared: **2026-07-20**
- Branch: `agent/m0-baseline`
- Starting commit: `e8237479a79f3188263f17fe2e9ed69348a3c646`
- Baseline commit: `558a4cbd74e1ed02be7c0691220a5c64f8572cd5`
- Draft PR: [#1](https://github.com/Chris-Side-Projects/callysto-notebooks/pull/1)
- Worktree: **committed Milestone 0 branch; preserve it and inspect status before new work**
- Authorized scope: **Milestone 0 / T001-T010 only**
- Product milestones M1-M8: **not authorized**

## Resume instruction

When the owner says **“let's continue”**, resume in
`/Users/christelles/Documents/Coding/EdTech/callysto-notebooks`, read this file and
[`TODO.md`](./TODO.md), inspect `git status` and draft PR #1, and preserve any later work. T001/T002
and the approved specification/mockup baseline are committed and pushed. The Ubuntu 24.04 workflow
passed; repository review/merge is the next boundary. Do not stack T003 onto this branch before the
baseline lands.

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
- Baseline commit `558a4cb` passed the complete Ubuntu 24.04 `verify` workflow in 1m26s on draft PR
  #1.

Why: future product work needs a reproducible, enforceable gate; a passing build on one machine is
not enough, and dependency install scripts are a supply-chain boundary.

### T004 local proof — implemented; deployment proof pending

- Clarified the exact binary `callysto-cell-id-v1` algorithm in `ARCHITECTURE.md`.
- Added normative Python/Node golden vectors, including Unicode, array/string source, ordinal/type,
  and the raw-digest-versus-ASCII-hex negative case.
- Added a standard-library default-deny converter proof that never executes notebook source, blocks
  active output, checks raster signatures and size limits, and produces deterministic manifests.
- Added a SQLite reference model proving lease-epoch and draft-generation fencing cases.

Why: cell anchors and stale-worker rejection must be deterministic before review records or render
state are persisted. This is local plumbing evidence only; it is not proof of PostgreSQL, Railway,
R2, or network isolation.

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
  24 Python proof cases and the independent Node vector consumer passed.
- Clean disposable `npm ci`: passed with 443 packages, no dependency lifecycle script executed, and
  no unreviewed scripts pending.
- Dependency tree: `npm ls` passed for the native/build-tool branches.
- Canonical `npm run check`: passed—format, lint, typecheck, 11 unit tests, 3 integration tests, 24
  Python tests, independent Node cell-ID vectors, 27-file documentation check, and Next production
  build.
- Clean-install copy: the same checks passed; the first sandboxed build was denied permission to bind
  a local port, then the exact build passed with that permission.
- Production audit: zero vulnerabilities.
- Full audit: four moderate development-only Drizzle Kit/esbuild findings; accepted temporarily in
  [`docs/DEPENDENCY_RISKS.md`](./docs/DEPENDENCY_RISKS.md).
- Local Playwright baseline: **pass** in development and CI-equivalent production-server modes—2
  Chromium E2E tests, 6 exact header tests across Chromium/Firefox, and 4 Chromium axe smoke tests.
- The axe result is an automated serious/critical smoke baseline through WCAG 2.2 tags, not a claim
  of full WCAG conformance; manual accessibility evidence remains required.
- GitHub Actions: **pass** for baseline commit `558a4cb` in
  [workflow run 29780426457](https://github.com/Chris-Side-Projects/callysto-notebooks/actions/runs/29780426457).
- Staging/production/provider/real-user evidence: **none**.

Detailed local evidence is in [`docs/evidence/M0.2-M0.4.md`](./docs/evidence/M0.2-M0.4.md) and
[`docs/evidence/M0.6.md`](./docs/evidence/M0.6.md).

## Exact next sequence and why

1. **Review and merge draft PR #1 when the owner is satisfied.** Merge is not implied by approval to
   commit/push and remains a separate repository action.
2. **After the baseline lands, build T003 as a real two-origin proof on a new branch.** Add the
   app-owned cell shell, cookieless output server,
   signed short capabilities, hostile fixtures, two-browser isolation, expiry/lazy-refresh, no-store,
   and ≤60-second restriction evidence. Current app headers alone do not complete T003.
3. **Port T004 semantics to PostgreSQL/deployment.** Prove DB-clock leases, `SKIP LOCKED`, concurrent
   workers, crash/retry, secret absence, no converter egress, and sentinel non-execution. SQLite does
   not close T004.
4. **Collect owner-supplied external inputs.** T005 needs 6–10 named candidates and at least 8 real
   notebooks; T006 then proves only the selected ingestion path. T007/T008 need provider accounts,
   staging credentials, and topology decisions. T010 needs legal/policy owners and deadlines.
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

Expected versions: Node `v24.18.0`, npm `11.16.0`, Python `3.14.6`. Do not use
`npm audit fix --force`. Do not add Auth.js, storage, database, or provider dependencies until their
specific M0 task requires them.

## Restart-safe state

- No server, browser, watcher, or database was intentionally left running.
- Temporary runtimes and browser binaries are under `/private/tmp` and may disappear on restart;
  their exact URLs/checksums are encoded in `scripts/bootstrap-macos-arm64-runtimes.sh`, not treated
  as hidden project inputs.
- GitHub CLI authentication was refreshed in the local keyring; no token or credential is stored in
  the repository or documentation.
- Baseline commit `558a4cb` was pushed and draft PR #1 was opened. No merge, deployment, migration,
  provider configuration, public launch, or external outreach occurred.
- The pre-final-check ignored `.next` cache was moved intact to
  `/private/tmp/callysto-next-cache-20260720-172458`; it is disposable and not part of the project.
