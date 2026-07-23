# Callysto active queue

- Status: **MILESTONE 0 ACTIVE**
- Last reconciled: 2026-07-22 22:32 -03 (2026-07-23T01:32Z)
- Complete sequence: [`PLAN.md`](./PLAN.md)
- Rule: this file contains only work eligible to start next; it is not a second roadmap

## Approval completed

### T000 — Owner review and decision lock

- Status: **COMPLETE — APPROVED 2026-07-20**
- Implementation changes authorized: **T001-T010 / Milestone 0 only**
- Inputs:
  - [`INTENT.md`](./INTENT.md)
  - [`DECISIONS.md`](./DECISIONS.md)
  - [`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md)
  - [`UX_SPEC.md`](./UX_SPEC.md)
  - [`ARCHITECTURE.md`](./ARCHITECTURE.md)
  - [`PLAN.md`](./PLAN.md)
  - [`docs/PLANNING_REVIEW.md`](./docs/PLANNING_REVIEW.md)

Owner decisions:

- [x] Approve the narrower product wedge: public contextual review for computational claims.
- [x] Approve notebook- and cell-level review in the MVP.
- [x] Approve an early cohort-source audit and the 80% decision rule for direct upload versus GitHub exact-commit; build only the selected path.
- [x] Approve invite-only publishing and an assigned-review cohort.
- [x] Approve no notebook execution in the pilot.
- [x] Approve immutable accepted/source versions, explicit drafts, audited render revisions, frozen public paths, and the exact cell-ID algorithm.
- [x] Approve the app-owned cell shell plus isolated rich-output boundary.
- [x] Approve GitHub + ORCID identity with the documented fallback.
- [x] Approve additive non-possessory roles, verified private contact, and minimal transactional review email.
- [x] Approve owner `addressed` versus reviewer `resolved`, plus the 15-minute comment edit window.
- [x] Approve incoming-object promotion, stale-attempt fencing, short on-demand content capabilities/no-store, and recovery objectives.
- [x] Approve the editorial visual direction and mandatory mockup gate.
- [x] Identify the project owner as decision owner; T010 still assigns legal/policy approvers.
- [x] Approve the proposed file/output limits and success criteria as M0 hypotheses to test.

Completion evidence:

- Every entry in `DECISIONS.md` is marked `ACCEPTED`, `REJECTED`, or `SUPERSEDED`, with date and owner.
- Any amendments are reflected in product, UX, architecture, security, testing, and plan documents.
- T001–T010 are moved to Active/Up Next only after the above reconciliation.

## Active — Milestone 0 only

| ID | Work item | Dependency | Done when |
|---|---|---|---|
| T001 **COMPLETE — LOCAL 2026-07-20** | Repair conflicting scaffold routes/configuration. | T000 | Route/configuration contract and production build pass; evidence: [`docs/evidence/M0.2-M0.4.md`](./docs/evidence/M0.2-M0.4.md). |
| T002 **COMPLETE — LOCAL + HOSTED CI 2026-07-20** | Pin runtimes and repair dependency/tooling baseline. | T000 | Strict clean install, exact Python 3.14.6, core gate, browser suites, and the Ubuntu 24.04 workflow pass; evidence: [`docs/evidence/M0.2-M0.4.md`](./docs/evidence/M0.2-M0.4.md). |
| T003 **COMPLETE — LOCAL FEASIBILITY 2026-07-20** | Prove application/content headers, app-owned cell shell, output isolation, on-demand short capabilities, and revocation SLO. | T002 | The two-host browser proof passes 14 cases and the Worker source contract passes 8 local cases. Deployed Cloudflare/R2/CDN evidence remains a cloud gate. See [`docs/evidence/M0.5.md`](./docs/evidence/M0.5.md). |
| T004 **PARTIAL — FENCING + STRENGTHENED PROVIDER SLICE; FULL DEPLOYED GATE OPEN** | Prove fenced orchestrator plus credential-free no-network converter and exact cell-ID vectors. | T002 | PostgreSQL fencing and Python/vector proofs pass locally/CI; the strengthened digest-bound synthetic converter slice passed in ephemeral Vercel compute and reconciled to zero resources. The full hostile/limit/failure matrix has not run, outer metadata stayed reachable, mutable live-`dnf` prevents an immutable-runtime claim, and a DB/R2-only orchestrator platform remains unselected. See [`docs/evidence/M0.6.md`](./docs/evidence/M0.6.md). |
| T005 **EXTERNAL INPUT REQUIRED** | Recruit/interview candidate cohort and select one ingestion source using the documented rule. | T000 | Repository work is exhausted; 6–10 participants/8 notebooks still need real source-workflow interviews, reviewers, and the non-gameable calculation. |
| T006 | Prove incoming-object promotion and draft-generation integrity for the selected source path. | T002, T005 | Server stream/hash, distinct no-overwrite accepted key, overwrite/retry/crash/stale-generation tests pass against staging storage. |
| T007 **EXTERNAL INPUT REQUIRED** | Prove GitHub/ORCID, verified private email, additive roles/operator bootstrap, and fenced transactional delivery. | T002 | The exact provider/owner matrix exists; real apps, identities, email decisions, sender/DNS, operators, and staging exercises remain absent. |
| T008 | Prove database/object recovery topology and objectives. | T002 | PITR meets approved database RPO/RTO; separately credentialed published-original recovery meets the approved RPO (proposed RPO 0) and preserves restrictions/digests. |
| T009 **COMPLETE — OWNER APPROVED 2026-07-20** | Produce and approve responsive mockups. | T000 | Homepage, desktop review, mobile inline discussion, and draft failure/processing views in [`docs/design/m0`](./docs/design/m0/) were approved without amendment under D024. |
| T010 **EXTERNAL OWNER/APPROVER INPUT REQUIRED** | Resolve repository/content licensing and policy owners. | T000 | The complete decision matrix exists; actual decisions, owners, approvers, and pre-launch deadlines remain absent. |

**M1 NO-GO — REAFFIRMED 2026-07-22.** Do not open M1 tasks until every blocked Milestone 0 row in
[`docs/evidence/M0-gate-reconciliation.md`](./docs/evidence/M0-gate-reconciliation.md) is green and
the owner explicitly approves the gate.

## Current evidence boundary

Resolved in the recorded local, hosted-CI, or disposable-provider environments:

- one canonical dynamic notebook route and one PostCSS configuration;
- exact dependency/runtime declarations and strict install-script policy;
- lint, formatting, typecheck, unit/integration/Python/vector/doc checks, production audit, and build;
- current reconciled local counts: 18 unit, 19 integration, 41 Python, and 35 Markdown checks;
- local development and production-server Playwright baselines: canonical/invalid routes, exact
  application headers in Chromium/Firefox, and serious/critical axe smoke checks through WCAG 2.2;
- local two-host app/content isolation, per-request nonce CSP, Ed25519 artifact capabilities,
  hostile-output confinement, lazy refresh, and bounded restriction behavior in Chromium/Firefox;
- local proof-only cell-ID/default-deny conversion plus a minimized child-process boundary and real
  PostgreSQL database-clock/`SKIP LOCKED`/lease-generation fencing;
- strengthened disposable Vercel converter proof on the digest-bound synthetic fixture: literal
  non-execution marker, controlled zero-hit canary, inherited-descriptor, deterministic retry,
  nested isolation, input/harness identity, and zero-resource reconciliation passed; the outer
  metadata probe remained reachable and Docker 25.0.14 came from mutable live `dnf`;
- reconciled PR #2 proof head `48805cc` passes hardened Ubuntu 24.04 hosted run `29846200710`;
- owner-approved responsive product-demonstration mockups.

Still open:

- deployed content-origin/provider behavior and DB/R2-only orchestrator enforcement; the
  strengthened disposable nested converter synthetic slice passed, but the complete hostile/
  limit/failure matrix is open and outer metadata denial failed;
- migrations, application APIs, authentication, storage, staging, production, and provider evidence;
- cohort/source choice and legal/policy ownership; exact missing inputs are recorded in
  [`docs/evidence/M0-cloud-and-external-gates.md`](./docs/evidence/M0-cloud-and-external-gates.md).

See [`CONTINUATION.md`](./CONTINUATION.md) for the exact restart sequence and why each step remains.

## Completed documentation work

- [x] Audited the scaffold and conflicting legacy documents.
- [x] Reframed the product intent around a closed contextual review loop.
- [x] Defined testable product requirements and launch gates.
- [x] Defined UX, revision, notification, accessibility, and failure states.
- [x] Defined data, API, job, storage, render, isolation, and recovery architecture.
- [x] Defined phased build, security, research, and validation plans.

## Session update protocol

At the end of an approved implementation session:

1. update the relevant task status and evidence link;
2. record newly discovered work under the correct milestone in `PLAN.md` before adding it here;
3. leave only one item `IN PROGRESS` per active owner unless parallel ownership is explicit;
4. record validation as `verified locally`, `verified in staging`, `verified in production`, or `not verified`;
5. never mark a task complete because code exists—its acceptance evidence must pass.
