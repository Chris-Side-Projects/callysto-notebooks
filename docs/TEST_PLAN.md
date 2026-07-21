# Callysto test and validation plan

- Status: **APPROVED VALIDATION CONTRACT — M0 HARNESS ACTIVE**
- Scope: invite-only publishing pilot
- Requirement sources: `PRODUCT_SPEC.md`, `UX_SPEC.md`, `ARCHITECTURE.md`, `docs/SECURITY.md`
- Current implementation status: local core, PostgreSQL fencing, converter-process, and two-host
  content-isolation harnesses pass; the merged baseline passes hosted Linux CI; the new proof branch,
  staging topology, and providers remain unverified remotely

## 1. Test objective

Testing must establish more than “the page renders.” It must prove that Callysto preserves an exact artifact and review record across hostile inputs, denied access, retries, orchestrator/converter crashes, browser boundaries, revisions, moderation, and deployment changes.

The highest-risk proof is:

```text
untrusted notebook
  -> byte-preserved private original
  -> validation and deterministic manifest without code execution
  -> inert application-owned cell shell
  -> isolated or rejected rich output
  -> immutable public version
  -> exact cell-anchored review
  -> response/resolution/revision without rewriting history
```

## 2. Evidence principles

- Prefer behavior and boundary tests over implementation-shape snapshots.
- A test failure must leave a named safe state; tests must reject false success.
- Unit tests use no network. Integration tests use an ephemeral database and deterministic fake or isolated test storage.
- Live-service tests are a separate staging suite and never run silently during ordinary local tests.
- Synthetic notebooks prove plumbing and security behavior, not scientific reproducibility.
- A mock provider does not verify real OAuth, R2 headers, Cloudflare isolation, email delivery, Railway deployment, or restore behavior.
- Every launch claim links to current evidence by environment and commit.

## 3. Toolchain status

| Layer | Current capability / remaining choice |
|---|---|
| TypeScript unit/baseline | Vitest 4.1.10; utility and repository-contract suites pass locally. |
| React/UI | No component-test library yet; select only when an active M0 proof needs it. |
| Database/integration | A dedicated-loopback PostgreSQL 17.9 proof covers DB-clock leases, `SKIP LOCKED`, expiry/reclaim, token/generation, stale completion, duplicate completion, and draft replacement; it is not a product migration. |
| Python | 30 standard-library cases pass under exact local Python 3.14.6, including a minimized converter subprocess/sentinel proof; deployed OS/network isolation is separate. |
| Browser/E2E/security | Playwright 1.61.1 app-shell baselines pass; 14 production-server security cases across Chromium/Firefox cover exact headers plus the gated two-host hostile-output/capability lifecycle proof. |
| Accessibility | axe Playwright 4.12.1 serious/critical smoke baseline passes on four routes through WCAG 2.2 tags; manual conformance evidence remains. |
| API contracts | Proposed render-manifest JSON schema, shared Python/Node cell-ID vectors, and a proof-only canonical Ed25519 capability/gateway contract. |
| Docs | Local-link, required-document, and trailing-whitespace checker passes. |
| Supply chain | Exact lockfile, strict lifecycle-script denial, clean production audit, documented dev exception; secret/license/SBOM work remains. |

Every claim remains environment-labeled. Current counts and commands are recorded in
[`docs/evidence/M0.2-M0.4.md`](./evidence/M0.2-M0.4.md),
[`docs/evidence/M0.5.md`](./evidence/M0.5.md), and [`docs/evidence/M0.6.md`](./evidence/M0.6.md);
deployment proofs cannot be replaced by the local harness.

## 4. Assurance matrix

| Requirement area | Unit | Integration | Browser/E2E | Staging/manual |
|---|---:|---:|---:|---:|
| Identity/account linking | policy functions | session/provider adapter | login/link/logout/expiry | real GitHub + ORCID callbacks |
| Roles/ownership | full decision table | ownership-scoped queries | denied UI/API journeys | operator invitation drill |
| Upload/integrity | validation/advisory digest | finalize/generation/fake promotion | progress/retry/reconnect | real R2 expiry/overwrite/server hash/no-overwrite promotion |
| Notebook validation | Python fixtures | job-to-state contract | named failure UI | orchestrator/converter resource limits |
| Non-execution | converter fixture | orchestrator/converter contract | sentinel/canary absence | deployed DB/R2-only orchestrator + no-network converter proof |
| Cell manifest | schema and stable IDs | TS/Python contract | anchors/outline/selection | representative real notebooks |
| Rich-output isolation | MIME policy | artifact/gateway contract | hostile cross-origin suite | real Cloudflare headers/origins |
| Publication/versioning | domain transitions | concurrent transactions | preview/publish/version switch | production-disabled smoke |
| Review/comments | state/auth/sanitizer | idempotent mutations/outbox | keyboard/mobile/thread flow | delivery and moderation drill |
| Notifications | template/preferences | outbox/retry/dedupe | deep-link journey | real provider outage/delivery |
| Discovery/export | cursor/schema | concurrent pagination/export | filters/download | data-retention check |
| Restriction/render recovery | policy | activation/restriction audit | neutral unavailable + disclosed rerender | capability-expiry/revision restore drill |
| Backup/rollback | not applicable | PITR/recovery inventory helpers | metadata outage state | isolated DB + accepted-original restore/RPO/RTO exercise |

## 5. Canonical notebook fixture corpus

Fixtures contain no secrets, personal data, copyrighted third-party notebooks, or network dependency. Each fixture has a small README/manifest declaring purpose, expected digest, expected state, and whether it is safe to open outside the test sandbox.

### Valid and representative

| Fixture | Purpose | Expected behavior |
|---|---|---|
| `minimal-python.ipynb` | One code cell, one Markdown cell, text output. | Ready; IDs and digest stable. |
| `saved-images.ipynb` | PNG/JPEG output. | Immutable asset references and accessible alt/fallback treatment. |
| `long-code-table.ipynb` | Horizontal overflow and dense table. | No page overflow; keyboard-accessible bounded scroll. |
| `markdown-links-math.ipynb` | Supported Markdown, links, equations. | Only documented subset; unsafe URL schemes stripped. |
| `pre-cell-id.ipynb` | Valid older notebook without cell IDs. | Deterministic normalized IDs; original unchanged. |
| `unicode-rtl.ipynb` | Unicode filenames/metadata and mixed direction text. | Correct validation, display, and no key/path influence. |
| `many-cells-under-limit.ipynb` | Near cell-count boundary. | Ready within configured resource limits. |

### Malformed and bounded failure

| Fixture | Purpose | Expected behavior |
|---|---|---|
| `empty.ipynb` | Empty file. | `INVALID_EMPTY`; original private; replace action. |
| `invalid-json.ipynb` | Broken JSON. | `INVALID_JSON`; no render artifacts. |
| `wrong-top-level.ipynb` | JSON with wrong root shape. | Named validation failure. |
| `unsupported-nbformat.ipynb` | Unsupported major version. | `NbformatUnsupported`. |
| `duplicate-cell-id.ipynb` | Two cells share valid ID. | `DuplicateCellId`; never silently repaired. |
| `invalid-cell-id.ipynb` | Disallowed/overlong cell ID. | Reject with named validation failure; only missing IDs are generated. |
| `over-cell-limit.ipynb` | More than configured cell maximum. | `NotebookLimitExceeded` before expensive render. |
| `oversize-source.ipynb` | Source exceeds byte limit. | Rejected before conversion allocation where possible. |
| `decoded-output-bomb.ipynb` | Small encoded/large decoded output. | Bounded failure before unbounded allocation. |
| `huge-render.ipynb` | Derived output exceeds render limit. | Terminal named failure; original retained privately. |

### Hostile active content

| Fixture | Threat | Required proof |
|---|---|---|
| `execute-sentinel.ipynb` | Code writes a sentinel file/network request if run. | Render completes without sentinel or request. |
| `script-output.ipynb` | Script reads cookies/storage and calls parent. | Script never executes. |
| `html-event-handler.ipynb` | Inline event XSS. | Active handler stripped, isolated without capability, or replaced. |
| `svg-script.ipynb` | SVG script/external resource. | Never inserted as trusted app-origin image/HTML. |
| `widget-state.ipynb` | Jupyter widget JavaScript/state. | Explicit unsupported/isolated behavior; no relaxed sandbox. |
| `external-resource.ipynb` | Remote image/script/style/font URLs. | Renderer has no fetch; browser policy blocks arbitrary requests. |
| `form-popup-navigation.ipynb` | Form, popup, top navigation. | Sandbox/CSP prevents all actions. |
| `manifest-confusion.json` | MIME/path/schema confusion. | App rejects invalid manifest and raises security alert. |
| `path-traversal-metadata.ipynb` | Filename/key traversal strings. | Opaque generated keys only; no filesystem/object escape. |

Maintain the hostile corpus as a permanent regression suite. A newly discovered sanitizer/browser bypass gets a fixture before remediation is considered complete.

## 6. TypeScript unit tests

Required complete decision tables:

- render-status and visibility transitions;
- separate draft lifecycle, render revision activation, visibility, scoped restriction, review-state, and thread-moderation-state transitions;
- publish preconditions and immutable metadata rules;
- pending-contact, participation-ready, additive role, revoked-publisher ownership, root-thread-author, suspended, and operator authorization for every mutation;
- provider account linking and identity collision behavior;
- upload/finalize/promotion/publish/thread/comment/assignment/report idempotency records, including same key + different payload conflict;
- cell-anchor validation;
- owner-address/root-author resolve/reopen/15-minute edit/tombstone permissions plus moderation close/restore from every review state without changing the preserved review state;
- topic/cursor validation;
- verified private-email onboarding and notification recipient/preference/template rules;
- restriction/lift/render-activation/retry eligibility;
- handle/slug freeze and version URL permanence;
- public-safe error mapping and log redaction;
- URL/canonical-version behavior;
- manifest JSON-schema validation and MIME policy dispatch.

Every domain denial needs an assertion that no state/audit/object mutation occurred except a permitted security/rate-limit record.

## 7. Python orchestrator and converter tests

### Parsing and normalization

- supported nbformat matrix;
- missing, invalid, and duplicate cell IDs;
- deterministic normalized IDs across repeated processes/machines;
- exact `callysto-cell-id-v1` golden vectors for Unicode/source/list-to-string/ordinal/type inputs and generated-collision failure;
- original byte digest unchanged;
- cell source digests and ordinal uniqueness;
- versioned metadata normalization audit;
- Unicode and large-but-in-limit behavior.

### Output policy

- source and plain text remain escaped data;
- Markdown raw HTML and unsafe schemes are disabled/removed;
- MIME selection never prefers an active format over a safe one without isolation;
- PNG/JPEG signatures and declared MIME agree;
- HTML/SVG/widgets/scripts are isolated or replaced;
- unsupported output produces a bounded explicit placeholder;
- manifest conforms to schema and contains no credentials/paths.

### Process and lease boundary

- no kernel startup or execution preprocessor import/path;
- sentinel code never runs;
- orchestrator network reaches only test PostgreSQL/R2; converter network/DNS/metadata access and inherited credential reads fail;
- timeout, memory, temporary-storage, and decoded-output limits terminate safely;
- temp directory is fresh and cleaned after success/failure;
- incoming overwrite before/after finalize cannot change promoted local bytes; conditional promotion crash/retry is safe;
- orchestrator crash, lease-token/generation loss, duplicate delivery, and stale completion do not commit false success;
- draft replacement during ingest/render rejects old-generation promotion;
- artifact keys/digests are deterministic for source + renderer/output-policy/normalization/manifest-schema identity.

### Property and fuzz tests

Bounded property/fuzz suites cover notebook JSON structure/depth, Unicode cell IDs/source, manifest schema/version dispatch, MIME bundle ordering/confusion, Markdown sanitizer parser differentials, and filenames/headers. Every failure must be bounded, deterministic, non-executing, and produce no accepted/public state. Keep minimized regressions as canonical fixtures.

## 8. Integration tests

Run against an ephemeral PostgreSQL database with actual migrations.

### Database and domain

- empty database migrates to head;
- uniqueness/foreign keys enforce one version number, one cell ID per version, one logical event key, and request-hash-bound idempotency records;
- publish transaction compares draft generation/source/manifest, freezes handle/slug, requires recovery proof, and is atomic under concurrent requests;
- ingest/render leasing uses `SKIP LOCKED`, token + monotonic generation fencing, lease expiry/renewal, bounded backoff, and max attempts correctly;
- a stale lease and a superseded draft generation cannot update the job/draft even if artifact writes finish;
- notification outbox is committed with the product event, fenced independently, honors a racing preference change, dead-letters after bounds, and handles crash after provider acceptance without losing the logical event;
- scoped restriction supersedes delivery/discovery without becoming render/visibility state and preserves private/audit history;
- render-revision activation preserves immutable source/version/cells/threads and records the old/new projection;
- cursor pagination remains stable during concurrent publication.

### Storage

- unique incoming-key upload authorization and expiry;
- overwrite before/after finalize, server streaming SHA-256/size, distinct accepted-key promotion, conditional no-overwrite, and promotion crash/retry;
- raw download byte digest round-trip;
- no overwrite of accepted/recovery original or published source record;
- ready state never references missing artifact;
- orphan-derived-object cleanup excludes published/original objects;
- content gateway maps only manifest-authorized opaque output IDs;
- restricted/revoked output returns neutral response; short capability expires; direct old URL cannot bypass issuance/restriction.

### Contract boundaries

- TypeScript and Python accept/reject the same manifest versions;
- orchestrator/converter error and fence codes map to durable states and public-safe messages;
- stale web/orchestrator/converter versions fail compatibly during rolling deployment;
- notification templates contain only allowed public metadata/deep links; verified-address/preference and provider-message behavior are auditable;
- logs across web/orchestrator/gateway/notifications carry correlation ID and redact forbidden data; converter has no secret-bearing environment.

## 9. Browser security suite

Run the application and content gateway on genuinely distinct local/staging origins. A different port alone is useful for origin behavior but staging must prove the deployed cookie/domain configuration.

The current local proof uses application host `127.0.0.1` and content host `localhost`, with the
gateway bound to loopback. This distinguishes host-only cookies and origin authority without
claiming a registrable-domain or CDN result. Its synthetic route/API is disabled unless the M0 proof
harness explicitly enables it.

For every hostile fixture, assert:

- no `alert`, script marker, event handler, form submission, popup, download, or top navigation;
- no read of app cookies, `localStorage`, `sessionStorage`, DOM, service worker, or authenticated API response;
- no arbitrary external network request;
- no unsanctioned `postMessage` capability bridge;
- output frames lack `allow-scripts`, `allow-same-origin`, forms, popups, and top-navigation permissions;
- application and content CSP, cookie scope, `nosniff`, referrer, permissions, no-store, and frame-ancestor headers match policy;
- malformed manifest/output identifiers cannot traverse or expose another artifact;
- draft-preview capability cannot expose another draft/generation and expires within 5 minutes;
- public capability expires within 60 seconds; restriction stops new issuance and reload/direct-artifact requests within the measured SLO; already loaded/downloaded bytes are not falsely claimed recalled;
- a long notebook left open beyond 60 seconds can request a later in-viewport output through the on-demand public issuance path, while a newly restricted or revoked output fails closed without page-position loss;
- restore or safe render-revision activation issues only the intended new capability and discloses regeneration;
- raw notebook is downloaded as an attachment, never navigated inline.

Also test sanitizer regression payloads directly in notebook Markdown, HTML output, SVG, metadata, filenames, topics, and comments.

## 10. End-to-end product journeys

### E2E-01 Public read

Logged-out reader opens canonical URL, lands on exact latest version, sees review question and trust sentence, navigates outline/cells, reads threads, downloads original, and switches to a historical version. No private API response or editable control appears.

### E2E-02 Invitation and first publication

Operator invites publisher → publisher signs in and verifies private contact → creates metadata → supplies the selected source → incoming bytes are server-promoted → disconnects/reloads during processing → previews exact generation/digests through expiring capability → separately affirms rights and public/non-execution facts → recovery copy verifies → publishes once despite double activation → opens frozen immutable URL.

### E2E-03 Named failures

Publisher uploads invalid JSON, duplicate IDs, unsupported format, oversized content, and renderer-timeout fixtures. Every case reaches a terminal named state, preserves appropriate draft/original data, and offers only valid retry/replace/support actions.

### E2E-04 Contextual review

Assigned reviewer follows notification → sees exact version/owner/review question/timing → accepts once despite retry → starts notebook-level and cell-level threads → edits own comment within 15 minutes → replies → copies permalink → owner receives notification → replies and marks addressed → root reviewer resolves or reopens → operator moderation-close remains visibly distinct. A separate decline case records no public judgment and sends no review-completion event.

### E2E-05 Revision

Owner creates revised version, enters change summary, links a prior thread as addressed, previews/publishes → old version and thread remain unchanged → historical page shows newer-version notice → linked reviewer receives one logical notification → new page links back correctly.

### E2E-06 Denied access

Logged-out/member/other publisher attempts every forbidden mutation by direct HTTP request, not only UI. Responses are safe and state remains unchanged.

### E2E-07 Report, restriction, and safe render revision

Member reports content → reauthenticated operator imposes scoped restriction with reason → discovery/new capabilities/raw download stop and old capability expires within SLO → audit/accepted/recovery originals remain private → fixed converter creates a new render revision → operator activates/lifts with audit → page returns with the same frozen source version and disclosed render-policy revision.

### E2E-08 Provider/outage resilience

OAuth/email verification unavailable, incoming overwrite/promotion delayed, DB transaction conflict, orchestrator/converter crash, lease loss, draft replacement, content gateway failure, and mail-provider accept/ack ambiguity each produce the documented partial state and recovery. Public metadata remains honest; product events are never falsely rolled back or duplicated.

### E2E-09 Permanent paths and recovery

After first publication, owner changes display name but cannot change public handle or notebook slug; old/latest/version/download/export URLs continue to resolve. An isolated point-in-time database restore plus accepted-original recovery inventory reconstructs versions, cells, threads, restrictions, render activation, and sampled digests within approved RPO/RTO, then regenerates one derived render.

## 11. UX and accessibility validation

Automated checks run on every core screen and state, but manual evidence is required before launch.

Manual matrix:

- widths 320, 375, 768, 1024, 1440 CSS px;
- 200% and 400% zoom;
- keyboard-only complete publisher/reviewer/operator journeys;
- VoiceOver + Safari and one additional screen-reader/browser pairing;
- light/dark OS setting if the product remains light-only, ensuring system contrast does not break;
- reduced motion and forced colors;
- long titles, identity names, topics, digests, comments, code, equations, tables, outputs, and translated/RTL text;
- output-frame focus entry/exit and fallback labeling;
- form error summary, progress announcement, comment insertion, resolution, and restricted-state announcement.

The application UI targets WCAG 2.2 AA. User-supplied notebook content is clearly bounded and must not be falsely certified accessible; Callysto still supplies accessible controls and fallbacks around it.

## 12. Performance and resilience

Use a reproducible fixture set and fixed staging topology.

- p75 application response under the proposed 1-second target, excluding isolated asset load;
- processing state visible within 500 ms of finalization;
- 95% of supported in-limit fixtures ready within 60 seconds;
- render queue depth/oldest-age behavior under bounded burst;
- orchestrator concurrency and converter CPU/memory/process/temp-space caps and safe overload;
- long notebook interaction without main-thread lockup or layout shift around review controls;
- cursor pagination query plan and absence of N+1 author/thread queries;
- capability signing/no-store overhead and restriction-to-expiry latency (not revocation-defeating cache optimization);
- web read availability during stopped orchestrator/converter/mail dispatcher;
- safe rolling deployment with old/new web, orchestrator/converter, schema, render-policy, and manifest versions;
- point-in-time DB + accepted-original recovery restore with sampled source/render digests and review/version/restriction relationships.

Performance results must state machine/service size, environment, commit, fixture mix, concurrency, warm/cold cache, and whether results are local or staging. No extrapolated “internet scale” claims.

## 13. CI and release gates

Proposed pull-request jobs:

```text
docs
js-static-and-unit
python-static-and-unit
database-storage-integration
production-build
browser-functional
browser-security
dependency-secret-license-scan
```

Required merge state: all applicable jobs green, reviewed migrations/contracts, no unresolved P0/P1 security or data-loss defect.

Required staging release evidence:

- verified private-email onboarding and real OAuth providers;
- real R2 incoming overwrite/server promotion/recovery-copy behavior plus application/content gateway headers/capabilities;
- real transactional email;
- full E2E cohort-critical journeys;
- two-browser hostile-content suite;
- operator restriction/render-activation, stale-fence/draft-generation, promotion, notification-ambiguity, and provider-outage drills;
- accessibility and performance reports;
- database PITR and accepted-original recovery exercise against approved RPO/RTO;
- public policy links and production feature flags default off.

## 14. Coverage policy

Line percentage is a diagnostic, not the acceptance criterion. Required semantic coverage is:

- every state transition and forbidden transition;
- every authorization matrix cell for mutation endpoints;
- every named error/rescue entry;
- every supported/isolated/rejected output class;
- duplicate delivery, different-payload replay, lease fencing, and draft-generation safety for finalize/promotion/publish/comment/job/notification;
- every launch-critical journey and hostile boundary.

Milestone 0 may set a minimum changed-code line/branch threshold to prevent accidental gaps, but a high percentage cannot substitute for the semantic matrix above.

## 15. Test artifacts and retention

Store with each release candidate:

- commit/image/renderer/output-policy/normalization/cell-ID/manifest-schema identifiers;
- CI report and failed-test disposition;
- browser security header and hostile-corpus results;
- migration list and database compatibility result;
- accessibility/performance reports;
- database/object recovery evidence with measured RPO/RTO and sampled digests;
- staging smoke and operator drill record;
- accepted residual risks and approver;
- pilot analytics dictionary version.

Never store secrets, OAuth recordings, presigned URLs, real notebook source, raw participant email, or private comments in test artifacts.
