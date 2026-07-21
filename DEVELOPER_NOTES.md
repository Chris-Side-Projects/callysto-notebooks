# Callysto developer notes

- Status: **M0 OPERATING CONTRACT ACTIVE; M1 NO-GO; M1-M8 NOT APPROVED**
- Last reconciled against working tree: 2026-07-21
- Repository: `Chris-Side-Projects/callysto-notebooks`
- Deployment: **no live application, integrated staging, or production environment; the only
  persistent new cloud record is an empty, unlinked Vercel proof project**

This document distinguishes the locally verified M0 scaffold/proofs from the system proposed in the specifications. Start every resumed session with [`CONTINUATION.md`](./CONTINUATION.md).

## 1. Documentation authority

Read in this order before implementation:

1. `CONTINUATION.md` — exact worktree, evidence, restart commands, and next task.
2. `INTENT.md` — problem and wedge.
3. `DECISIONS.md` — accepted/rejected architecture and product choices.
4. `PRODUCT_SPEC.md` — required user-visible behavior.
5. `UX_SPEC.md` — interaction and accessibility contract.
6. `ARCHITECTURE.md` and `docs/SECURITY.md` — boundaries and invariants.
7. `PLAN.md` and `TODO.md` — sequence and currently authorized work.
8. `docs/TEST_PLAN.md` — evidence required to call work complete.
9. `CODING.md` and `AGENTS.md` — implementation conventions.

If documents disagree, stop and reconcile the higher-authority product/decision document rather than choosing the convenient interpretation in code.

## 2. Current scaffold health

The scaffold is green raw material plus bounded proofs, not a working MVP. The local results below
were rerun on the reconciled working tree on 2026-07-21. Hosted CI remains historical evidence for
the named commits until the final branch head is pushed and passes again.

| Prior evidence | Result | Interpretation |
|---|---|---|
| Strict clean `npm ci` | Pass: 461 packages; no lifecycle script executed; no unreviewed scripts pending. | The exact lockfile and install-script policy are reproducible on the verified macOS arm64 runtime. |
| `npm run audit:prod` | Pass: zero vulnerabilities. | No known moderate-or-higher production finding at verification time. |
| `npm run audit:all` | Pass at `high`; reports 4 moderate Drizzle Kit/esbuild findings. | Accepted development-only exception in `docs/DEPENDENCY_RISKS.md`; do not expose the affected dev server. |
| `npm run lint` / `npm run typecheck` | Pass. | Baseline static contract is green. |
| Unit/integration | 18 unit and 19 integration cases pass. | Includes repository, local Worker, Vercel harness, capability, authority, TTL, and tamper contracts; this is still not product-domain coverage. |
| `npm run test:python` | 41 Python cases plus shared Node vectors pass under exact Python 3.14.6. | Includes exact launcher protocol validation, platform CA-store selection, pinned-image provenance, direct-child environment/descriptor/sentinel evidence, and a transitive project-local converter-module audit. |
| `npm run test:postgres:proof` | 4 cases pass against a disposable PostgreSQL 17.9 database. | Real local DB-clock, `SKIP LOCKED`, lease/generation/stale/duplicate/replacement semantics; proof DDL is not a migration. |
| `npm run docs:check` | Pass across 35 Markdown files. | Restart, evidence, external-input, and security links are internally consistent. |
| `npm run build` | Pass under exact Node 24.18.0/npm 11.16.0. | T001 build defect remains repaired; the build required normal outside-sandbox loopback process binding. |
| Browser suites | Pass locally: 2 Chromium E2E, 14 Chromium/Firefox security, and 4 Chromium axe smoke cases. | T003 local two-host hostile-output/capability feasibility is proven; deployed content-domain behavior and manual accessibility certification remain open. |
| GitHub Actions | Baseline `558a4cb` passed run `29780426457`; prior PR #2 head `1384dde` passed run `29797337843`. | T002 is complete, but final-head hosted CI is pending because reconciliation changes followed `1384dde`. |
| Disposable provider converter | One bounded Vercel Sandbox converter happy path ran and its Sandbox/snapshot were cleaned. | The outer Sandbox connected to link-local metadata over TCP. Inner container isolation passed that slice, but T004 remains partial and the orchestrator/content/R2/recovery matrix is open. |
| Database migrations/product APIs/auth/storage | Absent. | Product implementation has not started and is not implied by the green scaffold. |
| Staging/production | No live application, integrated staging, or production deployment exists. | An empty, unlinked `callysto-m0-proof` Vercel control project remains; ephemeral proof resources were cleaned. No Cloudflare Worker/R2 or Railway resource exists. |

See [`docs/evidence`](./docs/evidence/) for commands and environment boundaries.

## 3. Proposed runtime topology

```text
browser
  -> Next.js web/API
       -> PostgreSQL (metadata, state, jobs, review, audit, outbox)
       -> private R2 incoming authorization + accepted/derived metadata
       -> OAuth providers (GitHub, ORCID)
  -> cookieless content gateway (short-lived signed output capabilities)

Python job orchestrator
  -> leases PostgreSQL jobs with fence tokens
  -> network allowlisted only to PostgreSQL and private R2
  -> verifies/promotes incoming bytes and invokes local converter

Credential-free converter sandbox
  -> local input/output paths only
  -> no secrets, network, notebook execution, or public listener

notification dispatcher (topology selected and recorded in M0.9)
  -> leases notification outbox rows
  -> sends minimal transactional review email
  -> exposes health/readiness and dead-letter age/count
```

Proposed deployment:

- Railway is not accepted as the converter/orchestrator compute boundary from the current evidence.
  It remains a possible web/API or PostgreSQL provider only after explicit spend authority, dedicated
  credentials, and the relevant database/recovery proof.
- Vercel Sandbox established one bounded nested-container converter happy path only. Its outer
  metadata route was reachable, so it is rejected for the credential-bearing orchestrator.
- The metadata-safe orchestrator platform remains unselected; D013 applies until a provider proves
  exact PostgreSQL/private-R2-only egress and metadata denial.
- Private Cloudflare R2 primary and separately credentialed recovery locations, separate by environment.
- Cloudflare Worker/content hostname for immutable isolated outputs.
- GitHub Actions for merge gates and deploy orchestration.
- One transactional email provider selected after the Milestone 0 spike.
- One notification-dispatch topology selected in M0.9: a dedicated Railway process is recommended; a bounded web-triggered job is acceptable only if deployed scheduling, concurrency, fencing, health, and shutdown behavior pass the same contract and are documented here before M1.

This is a proposal, not current infrastructure. As of 2026-07-21 there is no live application,
integrated staging, or production environment. The only persistent new control-plane record is an
empty, unlinked Vercel project; all ephemeral proof Sandboxes/snapshots were cleaned. No Cloudflare
Worker/R2 or Railway resource exists, and the earlier shared Cloudflare token is rejected. Do not
create an ordinary cloud service merely to change that status: staging must prove the
converter/orchestrator egress, private/recovery R2, content-host, and recovery boundaries in M0. See
[`docs/evidence/M0-gate-reconciliation.md`](./docs/evidence/M0-gate-reconciliation.md) and
[`docs/evidence/M0-staging-topology.md`](./docs/evidence/M0-staging-topology.md).

Redis, BullMQ, Kubernetes, notebook execution, and a public renderer API are not part of the pilot.

## 4. Runtime and dependency policy

Current exact baseline:

- Node `24.18.0` and npm `11.16.0`;
- Python `3.14.6` pinned and locally verified;
- Next `16.2.10`, React/React DOM `19.2.7`, Drizzle ORM `0.45.2`, Drizzle Kit `0.31.10`;
- Vitest `4.1.10`, Playwright `1.61.1`, axe Playwright `4.12.1`, ESLint `9.39.5`, and TypeScript `5.9.3`;
- `@vercel/sandbox` `2.8.0` as a development-only, wrapper-confined feasibility dependency;
- no production Python dependency; the M0 proof intentionally uses the standard library.

`strict-allow-scripts=true` is mandatory. Root policy denies lifecycle scripts for `esbuild`,
`fsevents`, `sharp`, and `unrs-resolver`; locked prebuilt packages must satisfy the build or the gate
fails visibly. Never use `--dangerously-allow-all-scripts`, `approve-scripts --all`, or
`npm audit fix --force`.

Do not add Auth.js, R2, PostgreSQL test containers, Markdown/sanitizer, `nbformat`, or `nbconvert`
merely because the architecture mentions them. Add the smallest exact dependency only when the
active M0 proof requires it and update the dependency risk record.

Every new dependency needs a short record: why it is needed, why a smaller/native option is insufficient, maintenance/security posture, license, lockfile change, and removal path.

## 5. Local setup

### Current M0 setup

```bash
cd callysto-notebooks
./scripts/bootstrap-macos-arm64-runtimes.sh
export PATH="/private/tmp/callysto-runtime-v24.18.0-py3.14.6/node/bin:/private/tmp/callysto-runtime-v24.18.0-py3.14.6/python/bin:/usr/bin:/bin"
node --version      # v24.18.0
npm --version       # 11.16.0
python3 --version   # Python 3.14.6
npm ci
npm run audit:prod
npm run audit:all
npm run check
npm run browser:install
npm run test:e2e
npm run test:security
npm run test:a11y
```

`npm run test:postgres:proof` is separate from the ordinary gate because it deliberately requires a
dedicated loopback database named `callysto_m0_proof`; set `CALLYSTO_TEST_DATABASE_URL` only for that
disposable target. After a successful build, `npm run proof:m0` exposes the proof page locally and
must be stopped with Ctrl-C.

### Future product setup contract — not yet implemented

```bash
cp .env.example .env.local
npm ci
npm run db:migrate
npm run dev
```

In a second process:

```bash
npm run dev:renderer
```

The exact orchestrator/converter command is set during M0. Local development must support a local PostgreSQL database, a filesystem-backed fake primary/recovery object store, a local mail sink, a distinguishable local content origin, and a real no-network converter sandbox mode. Ordinary tests must not require live GitHub, ORCID, Cloudflare, Railway, or email-provider access.

## 6. Command contract

Implemented scripts:

```text
npm run dev                 web development server
npm run lint                JS/TS lint
npm run format:check        formatting check
npm run typecheck           TypeScript check
npm run test                JS/TS unit tests
npm run test:integration    current repository contract tests
npm run test:postgres:proof proof-only PostgreSQL lease/generation cases; dedicated DB required
npm run test:content-gateway:proof local Cloudflare Worker contract; no provider deployment
npm run test:vercel-sandbox:contract validates the metered-proof wrapper contract without cloud use
npm run test:e2e            Playwright product journeys
npm run test:security       cross-origin and hostile-content browser tests
npm run test:a11y           automated accessibility checks
npm run test:python         Python proof tests + shared Node cell-ID vectors
npm run docs:check          relative links and required doc-state checks
npm run build               production Next.js build
npm run check               complete local merge gate
npm run audit:prod          production dependency audit at moderate threshold
npm run audit:all           full dependency audit at high threshold
npm run browser:install     install Chromium and Firefox for Playwright
npm run proof:m0            start built proof-only app/content servers on loopback
```

`dev:renderer`, `db:generate`, and `db:migrate` are future commands, not current scripts. CI invokes
the same implemented project scripts rather than duplicating hidden shell logic.

### Metered Vercel proof wrapper

Use only the checked-in Python wrapper for the bounded provider proof. It validates the fixed
runtime and existing credential boundary; never copy, print, or manually export a `VERCEL_TOKEN`.
The converter command requires `/private/tmp/callysto-m0-converter-image.tar.gz`. Both commands are
metered external actions and require explicit authority:

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

Do not run orchestrator mode until the provider and exact egress/metadata targets are approved. The
provider run is labeled **verified in a disposable provider proof**, not staging or production.

### VPS credential intake

Use the global `use-vps-secrets-safely` skill and
[`docs/VPS_CREDENTIAL_HANDOFF.md`](./docs/VPS_CREDENTIAL_HANDOFF.md). For the Cloudflare procedure,
paste the value only after the terminal displays the hidden `Callysto Cloudflare token:` prompt.
The prompt intentionally echoes no characters. Never paste a token into script text, replace the
literal `$CALLYSTO_CF_TOKEN` variable reference, or expose it in command history, logs, chat, or Git.

## 7. Environment configuration

`.env.example` mostly documents the proposed configuration shape. The content-capability names are
wired only by the disabled-by-default M0 proof harness; this is not general product startup
validation. Later Milestone 0 work must reconcile exact names with selected libraries, split
variables by service identity, and make startup validation/tests authoritative.

Proposed configuration groups:

```env
# Application
APP_ENV=local
APP_URL=http://localhost:3000
CONTENT_ORIGIN=http://localhost:3001
PUBLISHING_ENABLED=false
COMMENTS_ENABLED=false

# Database
DATABASE_URL=postgresql://...

# Sessions / OAuth
AUTH_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
ORCID_CLIENT_ID=...
ORCID_CLIENT_SECRET=...
ORCID_BASE_URL=https://sandbox.orcid.org
EMAIL_ENCRYPTION_KEY=...
EMAIL_LOOKUP_HMAC_KEY=...
EMAIL_LOOKUP_HMAC_KEY_VERSION=1

# Private object storage
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_ENDPOINT=...
R2_RECOVERY_BUCKET_NAME=...
R2_RECOVERY_ACCESS_KEY_ID=...
R2_RECOVERY_SECRET_ACCESS_KEY=...
R2_RECOVERY_ENDPOINT=...

# Content capability signing (private key: application issuer only; public key: gateway only)
CONTENT_CAPABILITY_KEY_ID=...
CONTENT_CAPABILITY_PRIVATE_KEY_PEM=...
CONTENT_CAPABILITY_PUBLIC_KEY_PEM=...
CONTENT_PUBLIC_TTL_SECONDS=60
CONTENT_PREVIEW_TTL_SECONDS=300

# Renderer
RENDERER_VERSION=...
RENDER_POLICY_VERSION=...
NORMALIZATION_VERSION=...
MANIFEST_SCHEMA_VERSION=...
RENDER_JOB_LEASE_SECONDS=...
RENDER_MAX_ATTEMPTS=...
RENDER_MAX_SOURCE_BYTES=26214400
RENDER_MAX_DERIVED_BYTES=52428800

# Transactional notifications
NOTIFICATION_DISPATCH_MODE=dedicated
NOTIFICATION_DISPATCH_LEASE_SECONDS=...
NOTIFICATION_MAX_ATTEMPTS=...
MAIL_TRANSPORT=local
MAIL_FROM=...
MAIL_PROVIDER_TOKEN=...

# Observability
LOG_LEVEL=info
ERROR_REPORTING_DSN=...
```

Rules:

- Real values live only in local untracked files or the environment's secret store.
- Browser-exposed variables use an explicit allowlist and never contain secrets.
- Startup validates required variables and prints variable names, never values.
- Staging and production use distinct OAuth apps, databases, buckets, sender configuration, domains, and credentials.
- R2 credentials are capability-specific: web may authorize unique incoming keys; orchestrator may read incoming/accepted and write accepted/derived prefixes; converter has none; content gateway reads approved derived prefixes only; recovery identity handles a separate recovery location; normal runtime cannot delete recovery copies.

## 8. Data and storage conventions

Opaque IDs—not usernames, titles, filenames, or raw object keys—cross public APIs.

Proposed R2 layout:

```text
env/incoming/{upload_id}/{random_nonce}.ipynb
env/accepted/{accepted_original_id}/{source_sha256}.ipynb
env/normalized/{render_revision_id}/{source_sha256}.ipynb
env/manifests/{render_revision_id}/{manifest_sha256}.json
env/outputs/{render_revision_id}/{cell_id}/{output_id}/{artifact_sha256}
env/exports/{version_id}/{export_sha256}.json

recovery/{accepted_original_id}/{source_sha256}.ipynb
```

Incoming objects are replaceable/untrusted and lifecycle-cleaned. The orchestrator streams/hash-verifies them and promotes the exact local bytes to a different no-overwrite accepted key. Object keys are internal. Public/preview output URLs are short-lived signed capabilities for opaque render/output identifiers and use `no-store` in the pilot. Accepted/recovery originals never use a public bucket or `r2.dev` production endpoint.

The database is authoritative for state, leases/fences, draft generations, restrictions, and authorization; R2 is authoritative for immutable artifact bytes. `ready` commits only after artifacts exist and only through a fenced compare-and-set on the active upload/draft generation. Publication also requires a verified recovery copy.

## 9. Orchestrator and converter contracts

Orchestrator job input:

- ingest: one incoming object reference plus draft/upload generation and advisory digest; or render: one accepted-original reference;
- source digest and byte size;
- notebook version/draft IDs;
- renderer, output-policy, normalization, cell-ID, and manifest-schema versions;
- configured limits and correlation ID.

Orchestrator responsibilities:

- lease, heartbeat, and complete with token + generation fencing;
- stream/hash incoming bytes, conditionally promote exact local bytes, and enqueue render only after promotion;
- launch converter with local paths and a minimal allowlisted environment;
- write immutable artifacts and promote draft state only through active-upload/generation CAS; and
- create/verify the recovery copy before publication can pass.

Converter output:

- validation/error code;
- normalized notebook reference and digest;
- schema-validated render manifest;
- cell snapshots with stable IDs and source digests;
- safe asset and isolated rich-output references;
- kernel/format metadata and normalization audit;
- durations/resource usage and public-safe warnings.

The manifest also records renderer, output-policy, normalization, cell-ID, and manifest-schema versions. The converter must never start a kernel, import notebook code, resolve remote URLs, run shell commands from notebook data, inherit orchestrator secrets, or access any network. A test notebook that writes a sentinel file and requests a canary URL is the permanent non-execution/no-network regression test.

## 10. Development state and migrations

- State transitions belong in server-only domain functions, not components.
- Route handlers call shared authorization/policy functions; hidden buttons are not security boundaries.
- Migrations are additive/backward-compatible where possible and reviewed as SQL.
- A schema change includes migration test, fixture update, rollback/forward-fix note, and deployment order.
- Seed data is clearly labeled development data and can never populate production engagement metrics.
- Production debugging never copies real notebook bodies, emails, tokens, or comments into local fixtures.

## 11. Validation and evidence

Use the ladder in `PLAN.md` and the cases in `docs/TEST_PLAN.md`.

A handoff must say exactly where evidence was obtained:

- **verified locally** — ran against local fake/external substitutes;
- **verified in a disposable provider proof** — ran in temporary real provider compute, with the
  exact bounded conditions and cleanup result recorded; this is not integrated staging;
- **verified in staging** — ran against real service topology and staging providers;
- **verified in production** — ran a safe public/operational check after deploy;
- **not verified** — implementation or access boundary remains.

Do not call mocked R2, fake OAuth, synthetic notebooks, or local mail delivery production verification.
The external inputs for T005, T007, and T010 are absent. The local Worker contract and bounded
Vercel converter run do not complete T004 or authorize M1.

## 12. Deployment and operations

Deployment order and rollback are defined in `ARCHITECTURE.md`. Before enabling invited publishers:

- migrations are applied and checked;
- content capability, render-revision, orchestrator/converter, and manifest contracts are backward-compatible;
- web, content, orchestrator, converter, database, recovery-copy, and notification health are green;
- feature flags default off and are enabled operator → internal → cohort;
- approved database RPO/RTO and accepted-original recovery-copy age/restore check are visible;
- incoming promotion, stale-fence/draft replacement, restriction/render-revision restore, and retry drills have passed;
- public policies are linked;
- staging contains the exact release candidate.

Runbooks required in `docs/runbooks/` before launch:

```text
render-job-retry.md
poison-notebook.md
incoming-promotion-and-orphan-cleanup.md
content-restriction-and-render-restore.md
oauth-provider-outage.md
notification-provider-outage.md
content-origin-outage.md
database-and-object-recovery.md
credential-rotation.md
security-incident.md
```

## 13. Restart protocol for a new engineer or agent

1. Read the authority chain in Section 1.
2. Confirm `TODO.md` shows an approved active task.
3. Inspect `git status`, current branch, and recent commits; preserve unrelated user changes.
4. Reproduce the current validation baseline before editing.
5. Work only within the task's milestone and acceptance criteria.
6. Update tests/docs with the behavior.
7. Run relevant checks and then the full milestone gate.
8. Report changed files, evidence level, unresolved risk, and exact next eligible task.

If the owner has not approved T000, stop after read-only inspection or documentation review.
