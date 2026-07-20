# Callysto coding standard

- Status: **ACTIVE FOR AUTHORIZED MILESTONE 0 WORK; M1-M8 GATED**
- Scope: Next.js/TypeScript web application, Python job orchestrator and converter sandbox, tests, migrations, and infrastructure configuration
- Higher-authority contributor rules: [`AGENTS.md`](./AGENTS.md)

## 1. Before editing executable code

1. Confirm the owner approved T000 and the task is eligible in `TODO.md`.
2. Read the product, decision, architecture, security, test, and task documents named in `AGENTS.md`.
3. Inspect branch, recent commits, `git status`, and the files/tests you will change.
4. Reproduce the relevant baseline. Record pre-existing failures rather than absorbing them silently.
5. State the behavior, failure paths, acceptance tests, migration/deployment impact, and rollback surface before implementation.

Documentation-only corrections do not require the executable-code checklist, but they still require consistency and link checks.

## 2. General rules

- Prefer clear, small, typed functions over clever abstraction.
- Names describe domain behavior: `finalizeUpload`, `leaseRenderJob`, `publishVersion`, `resolveThread`.
- Comments explain why an invariant or unusual constraint exists; code explains what it does.
- No silent catches, empty fallbacks, false success, indefinite polling, or generic `try again` when the failure is known.
- Unexpected exceptions include correlation context, map to a safe state, and remain visible to operators. They never mark work successful.
- Keep I/O at boundaries and domain decisions in deterministic functions.
- Do not create a framework, base class, generic repository, event bus, or service layer until at least two concrete uses justify it.
- Do not add future-pilot fields/controls “while here.” Scope follows accepted requirements.

## 3. TypeScript and Next.js

- TypeScript strict mode stays enabled. Do not use `any`, unchecked casts, or non-null assertions to bypass a contract.
- Validate all external values at runtime: request bodies, route/query params, session/provider data, database JSON, manifest JSON, environment, and storage metadata.
- Prefer discriminated unions for render/visibility/job/thread result states.
- Use server components for reads where useful and Route Handlers for documented HTTP APIs. UI/server actions call the same server-only domain authorization functions.
- Never import server secrets, database clients, storage credentials, or authorization code into client bundles.
- `use client` belongs at the smallest interaction boundary.
- Avoid application `dangerouslySetInnerHTML`. Any approved sanitizer use must be isolated, versioned, reviewed, and covered by the hostile corpus.
- Escape notebook source/plain output as text. The app shell never trusts MIME or HTML from a query parameter or client object.
- Every asynchronous UI action has pending, success, named error, duplicate-submit, session-expiry, and retry/preservation behavior where applicable.
- Generate accessible HTML: native elements first, labeled controls, visible focus, semantic status/error regions, no pointer-only behavior.

### Imports and structure

- Use the configured `@/` alias for stable project-root imports after M0 confirms it.
- Keep server-only modules under explicit server-only boundaries (`lib/auth`, `lib/db`, `lib/domain`, `lib/storage`).
- Components do not query the database or construct object keys directly.
- Route handlers do not duplicate domain transition logic.
- Circular imports and barrel files that hide client/server boundaries are forbidden.

## 4. Python orchestrator and converter

- Type annotations are required on public functions and boundary data.
- Use `pathlib` for local paths, but only with a fresh server-selected temporary root.
- Notebook metadata, filenames, and cell source never construct filesystem paths or commands.
- The orchestrator owns fenced jobs, incoming verification/promotion, local-file staging, and immutable artifact writes. Its egress is allowlisted to PostgreSQL/private R2 only.
- The converter contains no kernel startup, `ExecutePreprocessor`, notebook execution, shell-command, dynamic import-from-notebook, credential, or network path.
- Parse into typed internal structures; validate the outgoing manifest against the shared schema.
- Read/decode bounded chunks where possible and check declared/encoded sizes before allocation.
- Temporary artifacts are removed on every success, failure, timeout, and lease-loss path.
- Renderer/output-policy/normalization/cell-ID/manifest-schema versions are explicit inputs to deterministic artifact keys and manifests.
- Validation failures are permanent; service/storage failures are retryable only when the error registry says so.

## 5. Domain state and errors

Use explicit result/error types for expected domain failures. A named error includes:

- stable internal code;
- retryability/terminal classification;
- public-safe message key;
- operator-safe context fields;
- HTTP mapping where relevant;
- audit/metric behavior;
- rescue or next action.

State transitions:

- occur in one domain function and transaction boundary;
- check actor, relationship, current state, and idempotency key;
- reject impossible or stale transitions;
- write audit/outbox records atomically when required;
- return the existing outcome for a valid duplicate request;
- do not perform external email delivery or object promotion inside the product transaction.

Never combine `render_status` and `visibility` into one enum.

## 6. Authentication and authorization

- Authentication identifies an actor; it does not authorize an object action.
- Publisher/operator are additive capabilities. Operator alone never grants notebook ownership/edit/publish rights; no self-elevation endpoint exists.
- Every mutation evaluates server-side role, ownership, target state, and action eligibility.
- Scope database lookup by authorized relationship when possible; do not fetch arbitrary objects and rely on a later UI check.
- No email-only account merge. Provider linking requires an authenticated session and complete second-provider flow.
- A participation email is private and usable only after a provider-verified claim or Callysto verification flow.
- Route/UI tests include direct forbidden HTTP requests for every role/ownership case.
- Operator actions require reason, correlation ID, audit record, and confirmation for high-impact reversible actions.

## 7. Database and migrations

- PostgreSQL constraints protect identity and invariants: unique version number, cell ID, idempotency/event key, and relationship integrity.
- Transactions remain short; render work and email delivery happen outside them.
- Durable orchestrator/notification jobs lease rows with `SKIP LOCKED`, token + monotonic generation fencing, and compare-and-set heartbeats/completion. Draft state additionally compares active upload + draft generation.
- Queries used in lists are indexed and checked for N+1 behavior.
- Every schema change includes generated/reviewed SQL, empty-to-head migration test, compatibility/deployment order, fixtures, and rollback or forward-fix note.
- Do not edit an already-deployed migration; add a new one.
- Never run destructive production DDL or data cleanup from application startup.

## 8. Storage and artifact integrity

- Application code calls a narrow storage interface; only the implementation knows R2 details.
- Object keys are opaque, server-generated, environment-prefixed, and never derived from usernames/titles/filenames.
- Presigned uploads land only at unique untrusted incoming keys. `HEAD`, ETag, and browser digest never establish accepted bytes.
- The orchestrator streams/hash-verifies incoming bytes and conditionally promotes those exact local bytes to a different no-overwrite accepted key. Accepted/recovery originals and published source records are append-only.
- `ready` commits only after every referenced artifact exists and its digest/manifest entry is known.
- Public/preview delivery uses short signed capabilities for opaque render/output IDs through the content gateway, never arbitrary R2 keys. Pilot user artifacts are `no-store` so restriction latency is bounded by capability expiry.
- Raw notebooks use attachment disposition and `nosniff`.

## 9. UI and CSS

- Implement only approved mockups and UX behavior. Current scaffold visuals are not constraints.
- Use design tokens for color, typography, spacing, focus, overlays, and density.
- No fabricated counts, demo records masquerading as live data, inert controls, decorative animation that competes with the artifact, or hidden mobile feature loss.
- Every data surface specifies loading, empty, error, success, stale/partial, and unavailable/restricted behavior.
- Test 320, 375, 768, 1024, and 1440 px plus required zoom/keyboard/forced-colors states.
- Notebook cell wrappers and review controls are application-owned. Rich-output frames are titled, bounded, and receive no permission escalation for convenience.

## 10. Tests

Follow `docs/TEST_PLAN.md`.

Every behavior change includes the smallest relevant mix of:

- deterministic unit decision table;
- ephemeral Postgres/storage/outbox integration test;
- Python fixture test;
- browser product/security/accessibility test;
- migration/deployment/rollback check;
- docs/contract check.

Test names describe behavior and condition, for example:

```text
rejects_publish_when_preview_manifest_changed
returns_existing_version_for_duplicate_publish_key
does_not_execute_notebook_side_effect_during_render
keeps_version_one_thread_when_version_two_is_published
blocks_svg_script_from_application_origin
```

Do not weaken assertions, skip hostile fixtures, disable lint rules, or exclude failing production files to make a gate green.

## 11. Logging, privacy, and observability

- Use structured events and stable error codes, not interpolated notebook/user content.
- Include correlation ID and opaque target/actor IDs where allowed.
- Never log notebook source/output bodies, comment bodies, raw email, OAuth/session token, cookie, secret, presigned URL, arbitrary object key, or report detail.
- Metrics labels are bounded enums/versions, never usernames, titles, URLs, cells, comments, or errors with arbitrary text.
- User-facing support codes locate redacted operator context without embedding sensitive data.

## 12. Dependencies and generated files

- Follow the approval record required by `AGENTS.md`.
- Commit lockfiles and reviewed migrations/contracts.
- Do not hand-edit generated migration snapshots, `next-env.d.ts`, build caches, coverage output, virtual environments, or compiled artifacts unless the tool contract explicitly requires a checked-in artifact.
- Keep `.next`, `*.tsbuildinfo`, `.env*` secrets, Python caches, test artifacts, and local database/storage/mail data ignored.

## 13. Git and handoff

Authorized commit identity:

```text
name:  edwardtheclaw
email: edward.the.claw@gmail.com
```

Commit one coherent green behavior using:

```text
type(scope): concise behavior change
```

Before handoff:

1. inspect the full diff and changed-file list;
2. run relevant tests, then the task/milestone gate;
3. verify no generated cache, secret, real user data, or unrelated change entered the diff;
4. update task/docs/evidence;
5. report what changed, how it was verified and where, unresolved concerns, migrations/dependencies/services, rollback, and exact next eligible task.

A sub-agent's report is not verification. The contributor responsible for handoff must inspect the diff and run the claimed checks.
