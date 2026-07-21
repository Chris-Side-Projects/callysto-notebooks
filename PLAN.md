# Callysto build plan

- Status: **MILESTONE 0 AUTHORIZED — M1-M8 GATED**
- Product stage: Milestone 0 feasibility; the product MVP is not implemented
- Planning unit: one milestone must end in independently verifiable behavior
- Product source of truth: [`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md)
- Technical source of truth: [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- Active queue: [`TODO.md`](./TODO.md)

## 1. Build objective

Build and pilot the smallest credible version of Callysto that proves one loop:

```text
publish an immutable notebook version
  -> inspect its cells and provenance
  -> leave a contextual review
  -> receive an owner response/address, reviewer resolution, or revised version
```

An upload page and notebook renderer alone do not satisfy the objective. Neither does a broad social network without evidence that review changes an analysis.

## 2. Approval boundary

The owner approved D001-D024 and authorized T001-T010/Milestone 0 on 2026-07-20. M0 may repair the scaffold, install approved development dependencies, create local/deployed feasibility proofs, prepare mockups, and collect the evidence named in this plan.

The approval does **not** authorize M1-M8 product features, production deployment, public launch, external outreach without identified participants, or silent relaxation of a failed promotion/isolation/capability/provider/recovery proof. M1 opens only after the M0 gate is green and the owner reviews the evidence.

## 3. Non-negotiable build invariants

- The credential-free converter never executes notebook code and has no network; the orchestrator reaches only PostgreSQL/R2.
- Incoming uploads are untrusted; accepted promoted originals and published source/version records are immutable.
- Comments bind to notebook version plus cell ID, never cell position.
- User-controlled notebook content never receives application-origin authority.
- Public claims distinguish format/render checks from scientific verification.
- Every mutation is authenticated where required, authorized server-side, validated, rate-limited, and audited where sensitive.
- A failed, duplicated, stale-lease, or superseded-generation job cannot produce a false `ready` or duplicate published version.
- No mocked engagement or inert control appears in staging or production.
- The project must have a clean, repeatable validation command before feature work grows.

## 4. Sequence and dependencies

```text
OWNER APPROVAL
      |
      v
M0 BASELINE + FEASIBILITY
      |
      v
M1 SECURE PLATFORM FOUNDATION
      |
      +---------------------+
      v                     v
M2 IDENTITY + DATA      M3 RENDERER CORE
      |                     |
      +----------+----------+
                 v
          M4 PUBLISH + READ
                 |
                 v
          M5 REVIEW LOOP
                 |
                 v
       M6 OPERATIONS + PORTABILITY
                 |
                 v
       M7 LAUNCH READINESS
                 |
                 v
          M8 COHORT PILOT
```

M2 and the isolated Python renderer core in M3 can proceed in parallel after M1. The upload finalization path depends on both. UX mockups can proceed alongside M0 feasibility work, but application UI implementation starts only after mockup approval.

## 5. Milestone summary

| Milestone | Outcome | Exit evidence |
|---|---|---|
| M0 | Broken scaffold becomes a trustworthy baseline and risky assumptions are tested. | Clean CI; feasibility notes and browser proofs; accepted decisions. |
| M1 | Secure application, primary/recovery storage, content capability, orchestrator, and converter boundaries exist. | Cross-origin isolation; egress boundary; promotion/recovery smoke; secret/header/log checks. |
| M2 | Identity, roles, invitations, domain schema, and authorization work. | Migration tests; provider staging tests; authorization matrix tests. |
| M3 | Server-promoted byte-preserving originals and fenced non-executing deterministic render revisions work. | Promotion/overwrite/fence/generation fixture suite; hostile-notebook browser tests. |
| M4 | An invited publisher can preview and publish an immutable public version. | End-to-end publish/read/download journey on staging. |
| M5 | A reviewer and owner can complete the contextual review loop. | Cell thread, reply, resolution/reopen, notification, and revision lineage E2E. |
| M6 | Discovery, export, reports, scoped restrictions, and operator recovery work. | Ops drills; export fixtures; no fabricated production content. |
| M7 | Product is safe and operable enough for a bounded external cohort. | All launch gates, restore exercise, accessibility/performance/security reports. |
| M8 | Cohort behavior answers whether Callysto should proceed, iterate, or reframe. | Metrics dictionary, event export, interviews, and written pilot decision. |

## 6. Detailed work plan

### M0 — Approval, baseline repair, and feasibility

**Purpose:** remove false assumptions before durable code is built.

| ID | Task | Depends on | Acceptance evidence |
|---|---|---|---|
| M0.1 | Record owner decisions and approval date. | Owner approval | Every proposed decision is accepted, rejected, or amended; taste choices have an explicit owner. |
| M0.1a | Recruit/interview the 6–10 candidate cohort and inventory each real notebook's source workflow. | M0.1 | At least 8 candidate notebooks record GitHub availability, privacy/rights constraints, current review method, and upload/import friction; apply the 80% source rule and update all affected docs before M3. |
| M0.2 | Repair the scaffold without preserving accidental tournament structure. | M0.1 | Duplicate dynamic routes and duplicate PostCSS configuration are removed; one coherent route convention remains. |
| M0.3 | Establish dependency and runtime baselines. | M0.1 | Node and Python versions are pinned; lockfiles are reproducible; missing Drizzle tooling is resolved; vulnerability findings are triaged, not ignored. |
| M0.4 | Add lint, unit, integration, browser, Python, and doc-link validation harnesses. | M0.3 | `npm ci`, lint, typecheck, tests, Python checks, production build, and doc checks run locally and in CI. |
| M0.5 | Prove application/content headers, app-owned shell, on-demand short capabilities, and isolated-output design in two real browsers. | M0.3 | Hostile output cannot execute/read/navigate/fetch; preview expires; a later output still loads after the first 60-second token lifetime; restriction stops refresh/new delivery within ≤60 seconds; user artifacts are not cached. |
| M0.6 | Prove the orchestrator/converter boundary, non-execution, deterministic cell-ID algorithm, and deployed egress enforcement. | M0.3 | Orchestrator reaches DB/R2 only; converter receives local paths with no secrets/network; side-effect/canary fixtures do nothing; current/pre-ID fixtures produce exact expected IDs. |
| M0.7 | Prove the selected ingestion path and trusted-original contract. | M0.1a, M0.3 | Direct path proves incoming overwrite, server streaming hash, different no-overwrite accepted key, promotion crash/retry, generation CAS; exact-commit alternative receives an equivalent fetch/integrity/SSRF contract. |
| M0.8 | Prove GitHub and ORCID identity feasibility. | M0.3 | Staging callbacks work, required scopes are documented, and collision/linking cases are decided. GitHub-only fallback is explicit if ORCID is blocked. |
| M0.9 | Select and prove verified private-email onboarding and minimal transactional delivery. | M0.1 | Verification source, sender domain, dedicated dispatcher deployment/trigger, preference race, fenced outbox, provider idempotency, crash-after-acceptance, dead letter, and local sink are documented/tested. |
| M0.10 | Produce responsive visual mockups for approval. | M0.1 | Homepage, notebook page, contextual thread, draft flow, and failure states are approved at mobile and desktop widths. |
| M0.11 | Resolve license and policy ownership. | M0.1 | Repository license, notebook-license menu, contributor terms, privacy/terms/AUP/copyright owners, and launch deadlines are recorded. |
| M0.12 | Prove recovery objectives and operator bootstrap. | M0.3 | Provider topology demonstrates proposed DB RPO/RTO, separate accepted-original recovery copy/no-delete credentials, isolated restore, offline operator grant, recent reauth, and MFA operating rule—or owner explicitly changes the objectives. |

#### M0 progress snapshot — 2026-07-20

- M0.1: complete; D001-D024 and M0 authorization are recorded.
- M0.2: locally complete; the canonical route/configuration contract and production build pass.
- M0.3/M0.4: complete and merged through PR #1. Local and Ubuntu 24.04 CI pass strict clean install, exact
  Node/npm/Python, audits, static/unit/integration/vector/docs checks, production build, and browser
  baselines.
- M0.5: local feasibility complete. A gated two-host shell/gateway, per-request nonce CSP, Ed25519
  capabilities, hostile HTML/SVG confinement, lazy refresh, preview/public expiry, and restriction
  bound pass 14 production-server cases in Chromium and Firefox. Deployed hostname/CDN evidence is
  still open.
- M0.6: exact cell-ID/default-deny conversion, minimized secret-free child process, and SQLite plus
  PostgreSQL 17.9 database-clock/`SKIP LOCKED`/generation fencing proofs pass locally. Deployed
  network/process isolation and orchestrator DB/R2-only egress remain open.
- M0.10: complete; four static responsive mockups were approved without amendment under D024.
- M0.1a/M0.7-M0.9/M0.11-M0.12: no real participant/provider/staging/policy evidence yet. Read-only
  provider inventory found CI but no Callysto deployment; exact owner/cloud inputs are recorded in
  [`docs/evidence/M0-cloud-and-external-gates.md`](./docs/evidence/M0-cloud-and-external-gates.md).

See [`CONTINUATION.md`](./CONTINUATION.md) and [`docs/evidence`](./docs/evidence/) for exact commands,
environment labels, and the next sequence.

**Gate:** no product feature milestone starts if the build is red or source choice, promotion, egress isolation, capability revocation, identity/contact, or recovery feasibility is unresolved. Redesign/change providers rather than weaken a boundary.

### M1 — Secure platform foundation

| ID | Task | Depends on | Acceptance evidence |
|---|---|---|---|
| M1.1 | Create environment-aware configuration with startup validation. | M0 | Missing or invalid required configuration fails fast without printing secrets. |
| M1.2 | Implement typed PostgreSQL access and migration workflow. | M0 | Empty database upgrades to head; rollback/forward-fix posture is documented; migration test runs in CI. |
| M1.3 | Implement primary/recovery object interfaces, incoming/accepted prefixes, conditional promotion, and deterministic local fakes. | M0.7, M0.12 | Staging service identities are least-privilege; converter has none; accepted/recovery writes and lifecycle exclusions pass. |
| M1.4 | Deploy signed-capability content gateway plus on-demand issuance and application/content header policies. | M0.5 | Only exact active-manifest outputs resolve; public/preview expiry and refresh, long-notebook lazy load, no-store, ≤60-second restriction SLO, CSP/cookie/sandbox tests pass. |
| M1.5 | Scaffold fenced Python orchestrator and credential-free converter boundary. | M0.6 | Deployed orchestrator is DB/R2 allowlisted; converter is non-root, bounded, secret-free, no-network, and non-executing. |
| M1.6 | Add structured logging, redaction, correlation IDs, health/readiness endpoints, and baseline metrics. | M1.1 | A sample request/job trace crosses services; secrets, notebook source, presigned URLs, and comment bodies are absent from logs. |
| M1.7 | Add feature flags for publishing, commenting, and operator-only rollout. | M1.1 | Features can be disabled without deployment or destructive data changes. |

### M2 — Identity, invitations, persistence, and policy boundaries

| ID | Task | Depends on | Acceptance evidence |
|---|---|---|---|
| M2.1 | Implement GitHub sign-in and session hardening. | M1 | Staging login/logout/session expiry pass; secure cookies and callback restrictions are tested. |
| M2.2 | Implement ORCID authenticated-iD sign-in or exercise documented fallback. | M0.8, M2.1 | Verified provider identifier is stored; typed identifiers are never shown as authenticated. |
| M2.3 | Implement explicit provider linking and collision handling. | M2.1 | Email match alone never merges users; collision tests cover both link directions. |
| M2.4 | Implement verified private-email onboarding, additive roles, invitations, offline operator bootstrap, recent reauth, and publisher revocation. | M2.1, M0.9, M0.12 | Pending/member/publisher/owner/operator/composed/suspended cases pass; no self-elevation or operator possession. |
| M2.5 | Implement draft, accepted-original, render-revision, activation, version, restriction, idempotency, event, and outbox schema/state functions. | M1.2 | Constraints prevent impossible lifecycle states and store explicit fences/generations/digests. |
| M2.6 | Implement immutable audit events for sensitive actions. | M2.5 | Grant/revoke, publish, unlist, restriction/lift, render activation, retry/fence rejection, address/resolve, and account actions record actor/cause/correlation ID. |
| M2.7 | Implement rate-limit abstraction and abuse-safe defaults. | M1.1 | Mutation limits have deterministic tests and never rely only on client behavior. |

### M3 — Ingestion and rendering

| ID | Task | Depends on | Acceptance evidence |
|---|---|---|---|
| M3.1 | Build draft metadata creation and validation. | M2.4, M2.5 | Required review question, claim/source statement, license, limits, and field errors match `PRODUCT_SPEC.md`. |
| M3.2 | Build selected-source authorization and advisory checksum/progress UI. | M1.3, M2.4 | Only owner publisher supplies source; incoming/exact-commit status and retry retain metadata. |
| M3.3 | Build idempotent finalize, fenced ingest verification/promotion, and accepted-only render enqueue. | M3.2, M2.5 | Presigned overwrite cannot alter accepted bytes; server digest/no-overwrite/promotion crash pass; duplicate/different-payload behavior is correct. |
| M3.4 | Build token/generation leasing, heartbeat, retry/dead-letter, draft-generation CAS, poison-job handling, and operator visibility. | M1.5, M3.3 | Lease-loss/stale completion/replacement/duplicate races reach one correct state and never promote stale work. |
| M3.5 | Build notebook validation, limits, and named error taxonomy. | M1.5 | Malformed, unsupported, oversized, duplicate-ID, and expansion fixtures fail safely and distinctly. |
| M3.6 | Preserve accepted original and create deterministic normalized notebook/cell manifest using `callysto-cell-id-v1`. | M3.5 | Accepted/recovery digest round-trip and cross-process exact-ID vectors pass; invalid/duplicate IDs reject. |
| M3.7 | Export immutable structured render revision and isolated display artifacts without execution/network. | M3.6 | Side-effect/canary fixtures prove boundary; artifact identity includes every policy/schema version; repeated jobs converge. |
| M3.8 | Render safe unsupported-output placeholders and enforce artifact limits. | M3.7 | Active/unsupported output never triggers weaker sandbox permissions or silent truncation. |
| M3.9 | Build durable named processing/failure UI. | M3.3–M3.8 | Refresh and reconnect recover server state; there is no indefinite generic spinner. |

### M4 — Preview, publication, and public reading

| ID | Task | Depends on | Acceptance evidence |
|---|---|---|---|
| M4.1 | Build approved homepage, navigation, login, invitation, and honest empty states. | M0.10, M2 | No mock engagement; accessibility smoke tests pass at specified widths. |
| M4.2 | Build staged draft details/source/processing/preview interface. | M3 | Expiring capability binds exact generation/render revision and shows candidate digests; stale preview cannot publish. |
| M4.3 | Implement atomic publication, frozen handle/slug, accepted-original recovery proof, canonical/version URLs, and render activation. | M3, M2.5 | Concurrent/duplicate publish produces one immutable source/version; old URLs persist; security rerender uses visible audited activation. |
| M4.4 | Build public notebook page with provenance, trust labels, anchors, and version lineage. | M4.3, M1.4 | Logged-out reader can inspect; labels never imply execution or correctness. |
| M4.5 | Build safe raw notebook download. | M4.3 | Attachment headers, `nosniff`, digest, scoped restriction behavior, and content type pass tests. |
| M4.6 | Implement unlist and version-aware metadata rules. | M4.3 | Unlisting removes discovery only; version-bound edits cannot mutate a published record. |

### M5 — Contextual review loop

| ID | Task | Depends on | Acceptance evidence |
|---|---|---|---|
| M5.1 | Implement notebook- and cell-thread domain/API with cell-anchor validation. | M4.4, M2.7 | Thread targets exact version/cell; absent anchors fail instead of reattaching. |
| M5.2 | Implement safe Markdown replies, 15-minute author edits/revisions, tombstones, and idempotency. | M5.1 | XSS, edit-window, different-payload replay, double-submit, session expiry, and ordered-reply tests pass. |
| M5.3 | Implement document-first contextual review UI. | M0.10, M5.2 | Keyboard/pointer/mobile flows preserve reading position and announce state changes. |
| M5.4 | Implement owner `addressed`, root-author resolve/reopen, and separate operator moderation-close. | M5.2 | Every capability/ownership/authorship combination and event label is covered; history remains visible. |
| M5.5 | Implement fenced transactional notifications for assignment, thread, reply, address/resolve, and linked revision. | M0.9, M5.2 | Preference race, provider idempotency, crash-after-acceptance, possible duplicate delivery, bounded retry/dead letter, and deep links pass. |
| M5.6 | Implement new-version lineage and prior-thread references. | M4.3, M5.1 | Version 1 discussion stays on version 1; version 2 can cite unresolved prior threads without moving them. |
| M5.7 | Implement privacy-safe pilot event store/export. | M5.1–M5.6 | Versioned dictionary defines substantive review, address, reviewer resolution, revision, closed loop, repeat action, allowlisted properties, pseudonyms, and retention before cohort use. |

### M6 — Discovery, portability, moderation, and recovery

| ID | Task | Depends on | Acceptance evidence |
|---|---|---|---|
| M6.1 | Build recent and exact-topic discovery with cursor pagination. | M4.3 | Stable pagination and empty/filter states pass concurrent-publication tests. |
| M6.2 | Build profile/publication view without vanity metrics. | M4.3 | Public data only; no public email/provider tokens; no inactive controls. |
| M6.3 | Build metadata and public-review JSON export. | M5 | Export schema, fixture, authorization, and digest linkage are documented and tested. |
| M6.4 | Build report flow and operator queue. | M5.2 | Reporter identity is private; duplicate/report-abuse cases are bounded. |
| M6.5 | Build scoped restriction/lift, audited render-revision activation, and job-retry controls. | M3.4, M6.4 | Staging drill stops new delivery within SLO, preserves source/recovery/audit, rejects cached/direct capability paths, then safely activates/restores. |
| M6.6 | Build lifecycle cleanup for abandoned drafts and orphan derived objects. | M3 | Retention rules are policy-backed; published originals are excluded from cleanup. |
| M6.7 | Complete operator runbooks and support-code lookup. | M6.4–M6.6 | A new operator can follow retry/fence, promotion, report, restriction/render activation, notification dead letter, and outage procedures in staging. |

### M7 — Launch readiness

| ID | Task | Depends on | Acceptance evidence |
|---|---|---|---|
| M7.1 | Complete full browser security, dependency, secret, and threat-model review. | M1–M6 | No open P0/P1 launch blocker; accepted residual risks are named by owner. |
| M7.2 | Complete WCAG 2.2 AA audit of application UI and remediate blockers. | M4–M6 | Automated checks plus keyboard/screen-reader/manual viewport evidence. |
| M7.3 | Complete performance and resource-limit tests. | M3–M6 | Product SLO targets pass on staging fixtures; overload fails safely. |
| M7.4 | Configure production deployment, DNS, isolated content origin, alerts, and rollback flags. | M1–M6 | Production smoke test runs with publishing disabled; credentials/environments are separated. |
| M7.5 | Test point-in-time database and accepted-original recovery into an isolated environment. | M2–M6 | Approved RPO/RTO, recovery-copy RPO, relationships, restrictions, and sampled digests are verified; a render is regenerated. |
| M7.6 | Publish approved terms, privacy, acceptable use, copyright/removal, retention, moderation, and license guidance. | M0.11 | Policies are linked in product and operations; escalation owner is named. |
| M7.7 | Finalize and schedule the cohort recruited in M0.1a. | Owner | At least 6 participants, 8 confirmed real notebooks, assigned reviewers, consent/expectations, and interview slots are recorded. |
| M7.8 | Run final release checklist and operator rehearsal. | M7.1–M7.7 | Every launch gate in `PRODUCT_SPEC.md` has linked evidence and an owner sign-off. |

### M8 — Cohort pilot and decision

| ID | Task | Depends on | Acceptance evidence |
|---|---|---|---|
| M8.1 | Onboard cohort and publish at least 8 real notebooks. | M7 | Funnel and support interventions are recorded without fabricating self-service success. |
| M8.2 | Run assigned contextual reviews and owner follow-up. | M8.1 | Review, response, resolution, revision, and repeat-action events are exportable and auditable. |
| M8.3 | Conduct structured owner and reviewer interviews. | M8.1 | At least 6 completed interviews cover current alternative, value, trust, friction, and willingness to return. |
| M8.4 | Analyze results against predeclared success criteria. | M8.2, M8.3 | Written analysis separates observed behavior, participant statements, operator effort, and inference. |
| M8.5 | Make proceed / iterate / stop-or-reframe decision. | M8.4 | Owner decision and rationale are recorded before expanding ingestion, execution, votes, forks, or private workspaces. |

## 7. Proposed implementation slices and commits

Each commit should be independently testable and leave the branch green. The list is sequencing guidance, not permission to commit.

```text
chore(baseline): remove conflicting scaffold routes and configs
chore(tooling): add reproducible lint test build and Python checks
test(security): prove app content and converter boundaries
chore(renderer): scaffold fenced orchestrator and no-network converter
feat(storage): add incoming promotion primary and recovery storage
feat(auth): add GitHub identity sessions and verified contact
feat(auth): add additive roles invitations linking and operator bootstrap
feat(domain): add draft version render restriction and audit models
feat(ingest): add source authorization verification and promotion
feat(render): add fenced validation normalization and render revisions
feat(render): add durable leases generation guards and failure states
feat(publish): add capability preview recovery proof and immutable publication
feat(read): add public notebook page provenance and downloads
feat(review): add versioned notebook and cell threads
feat(review): add replies address resolution and safe markdown
feat(notify): add fenced review outbox preferences and dead letters
feat(ops): add reports restrictions render activation and job recovery
feat(discovery): add recent topic and profile views
feat(export): add notebook metadata and review export
chore(release): add staging gates runbooks policies and pilot flags
```

Do not combine schema, auth, upload, renderer, and UI into a single “MVP” commit. Each domain behavior needs its own tests and rollback surface.

## 8. Validation ladder

At the end of every task, run the smallest relevant checks. At every milestone gate, run the full ladder:

```text
clean dependency install
  -> formatting and lint
  -> TypeScript typecheck
  -> TypeScript unit tests
  -> Python format/lint/type/unit tests
  -> database/storage integration tests
  -> production web build
  -> Playwright functional and cross-origin security tests
  -> documentation/link checks
```

M7 adds dependency/secret scans, accessibility audit, load/resource tests, backup/restore exercise, staging smoke tests, and manual browser/security review. Proposed exact commands live in [`DEVELOPER_NOTES.md`](./DEVELOPER_NOTES.md); they are not claimed to work until M0 implements them.

## 9. Scope controls

The following ideas require a new decision record and pilot evidence before entering this plan:

- browser or server notebook execution;
- GitHub repository synchronization;
- forking, editing, or notebook diffs;
- votes, trending, reputation, or reviewer scores;
- private/team/institutional workspaces;
- DOI minting or platform-issued reproducibility badges;
- dataset hosting or general compute capsules;
- Redis, Kubernetes, a general event bus, or multi-region topology.

## 10. Change and review protocol

1. A product behavior change starts in `PRODUCT_SPEC.md` and `DECISIONS.md`.
2. A boundary/data/API change updates `ARCHITECTURE.md`, `docs/SECURITY.md`, and `docs/TEST_PLAN.md` before or with code.
3. A user-flow change updates `UX_SPEC.md` and approved mockups before implementation.
4. `TODO.md` tracks only approved work currently eligible to start; this plan keeps the complete sequence.
5. Each milestone closes with a short evidence report linking tests, screenshots where relevant, migrations, runbooks, and unresolved risks.
6. Claims use evidence labels: `verified locally`, `verified in staging`, `verified in production`, or `not yet verified`.

## 11. Owner approval record

The owner approved this plan on 2026-07-20. That approval means “complete T001-T010/M0,” not “build
every later feature regardless of what the pilot teaches.” M1-M8 remain unauthorized, and the M8
proceed/iterate/stop-or-reframe decision gate remains binding.
