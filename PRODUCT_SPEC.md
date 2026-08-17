# Callysto product specification

- Status: **APPROVED PRODUCT CONTRACT — 2026-07-20**
- Product stage: Milestone 0 baseline and feasibility
- Initial release: invite-only publishing pilot
- Source of truth for: product scope, user-visible behavior, acceptance criteria
- Related: [`INTENT.md`](./INTENT.md), [`UX_SPEC.md`](./UX_SPEC.md), [`ARCHITECTURE.md`](./ARCHITECTURE.md), [`PLAN.md`](./PLAN.md)

## 1. Outcome

Callysto succeeds when a person who did not create a notebook can inspect a specific computational claim, discuss the relevant cell in context, and return later to a stable record of the artifact and review.

The pilot is not successful merely because notebooks can be uploaded or pages receive traffic.

## 2. Pilot participants

### Publisher

Has a notebook behind a real paper, preprint, report, replication, audit, or data-driven claim. Wants a stable public page and useful feedback without asking every reader to use Git.

### Reviewer

Wants to understand or challenge the analysis. Needs to point to a particular cell, see the exact notebook version under discussion, and distinguish open questions from resolved ones.

### Reader

Wants to inspect the artifact and review record without creating an account.

### Operator

Invites publishers, handles reports, diagnoses failures, and can apply/lift scoped restrictions or activate a safe render revision without taking ownership or silently editing historical source.

## 3. Core workflow

```text
INVITE
  -> SIGN IN
  -> CREATE DRAFT + METADATA
  -> SUPPLY NOTEBOOK THROUGH THE ONE COHORT-SELECTED SOURCE PATH
  -> VALIDATE + NORMALIZE + RENDER
       | success -> PREVIEW -> PUBLISH IMMUTABLE VERSION
       | failure -> NAMED ERROR -> REPLACE FILE OR ABANDON DRAFT
  -> PUBLIC READER OPENS VERSION
  -> AUTHENTICATED REVIEWER COMMENTS ON NOTEBOOK OR CELL
  -> AUTHOR RECEIVES A VERSION-SPECIFIC NOTIFICATION
  -> AUTHOR REPLIES / MARKS ADDRESSED / PUBLISHES REVISED VERSION
  -> ROOT REVIEWER RESOLVES OR REOPENS
```

## 4. Scope

### 4.1 Must ship in the pilot

- Public homepage explaining the product and showing real published notebooks.
- Public notebook page with safe static rendering and trust/provenance metadata.
- GitHub and ORCID authentication, subject to the Milestone 0 feasibility gate.
- Invite-gated publisher role.
- One cohort-selected ingestion path: direct `.ipynb` upload is the default; exact GitHub commit import is the documented alternative.
- Format validation, limits enforcement, normalization, and non-executing HTML rendering.
- Draft preview before publication.
- Immutable notebook versions and version-specific URLs.
- Notebook-level and cell-level threaded comments.
- Owner `addressed`, root-reviewer `resolved/reopened`, and separate operator moderation-close states.
- Minimal transactional notifications for assigned reviews, new threads, replies, and resolution/reopen events.
- Basic recent-notebook browsing and topic links based on approved metadata.
- Report-content control and scoped operator restriction/restoration path.
- Raw notebook download and metadata/review export.
- CI, staging, production deployment, structured logs, metrics, alerts, backup verification, and runbooks.

### 4.2 Explicitly not in the pilot

- Running notebook code in the browser or cloud.
- The unselected second ingestion path; mutable GitHub URL import, OAuth repository synchronization, and auto-sync are always out.
- Forking or editing notebooks on Callysto.
- Notebook or comment voting, ranking, or reputation scores.
- Private notebooks, teams, institutional workspaces, or SSO.
- DOI minting or claims of archival permanence beyond the documented retention policy.
- Callysto-issued scientific verification or replication badges.
- Dataset hosting beyond assets already embedded in the notebook.
- R, Julia, or non-Jupyter artifact guarantees beyond format-preserving display of valid notebook content.

## 5. Functional requirements

### 5.1 Identity and access

| ID | Requirement | Acceptance criterion |
|---|---|---|
| AUTH-01 | Anyone can read a published notebook and its public review record without signing in. | A logged-out browser can open every public version URL and no private API response is exposed. |
| AUTH-02 | Publishing, assignment acceptance, commenting, and reporting require an authenticated, participation-ready account. | Participation/content mutations return an explicit unauthenticated/onboarding-required response and do not mutate content/review state without a valid session and verified private notification address. A signed-in pending user may complete identity/contact/settings/export flows that are explicitly allowed by the authorization matrix. |
| AUTH-03 | Pilot sign-in supports GitHub and authenticated ORCID iDs. | Each provider completes login in staging; account identity is stored; manually typed ORCID identifiers are never treated as verified. |
| AUTH-04 | A publisher invitation is required to create or publish drafts. | A participation-ready authenticated user can comment but receives a clear invitation-required state on draft/publish routes. A signed-in user with contact verification pending remains read-only. |
| AUTH-05 | Account linking cannot merge identities based only on matching email. | Linking requires a signed-in session plus completion of the second provider flow; collision cases are tested. |
| AUTH-06 | `member` is the base account state; `publisher` and `operator` are additive capabilities. Operator capability does not grant content ownership. Publisher revocation does not transfer or erase ownership. | Every mutation checks capability, ownership, state, and recent reauthentication where required; an operator cannot edit or publish another owner's draft. A revoked publisher cannot create/edit/publish, but can still read/export and unlist owned work or use the policy removal path; existing publications do not change automatically. |
| AUTH-07 | Participation requires a private verified notification email obtained from a verified provider claim or Callysto confirmation flow. | Unverified/provider-private email never becomes public or trusted implicitly; changing the address requires verification; publishing, accepting an assignment, commenting, and reporting are blocked until complete. |

### 5.2 Draft and upload

ING-02 through ING-07 specify the recommended direct-upload contract. If the Milestone 0 cohort audit selects exact GitHub commit import, amend this section and the architecture/security/test contracts before implementation; never improvise a URL fetch beside the upload path.

| ID | Requirement | Acceptance criterion |
|---|---|---|
| ING-01 | A publisher can create a draft with title, description, a concrete review question, claim/source statement, optional external links, topics, and license selection. | Invalid, missing, or over-limit fields produce field-specific messages and no partial published record. |
| ING-02 | For direct upload, a publisher can upload exactly one `.ipynb` object to a unique untrusted `incoming` key using a short-lived URL restricted to that key and content type. | The URL expires and cannot write another key. Reuse or overwrite of the incoming key cannot change an accepted original, render, or draft generation. |
| ING-03 | A server-owned verifier promotes accepted bytes to a separate immutable original key before rendering. | It streams bytes, computes size and SHA-256 independently, compares any browser digest as advisory input, writes with no-overwrite/equivalent semantics, and render jobs reference only the promoted key/digest/storage identity. |
| ING-04 | The system validates notebook JSON and supported nbformat before rendering. | Invalid JSON, wrong top-level type, unsupported major version, duplicate IDs, and limit violations get distinct failure codes. |
| ING-05 | The system creates a normalized copy for display without modifying the original. | Older notebooks with missing IDs receive valid deterministic cell IDs in the normalized copy; existing invalid/duplicate IDs fail validation; an audit record describes normalization. |
| ING-06 | Upload, finalize, promotion, and enqueue operations are idempotent. | Repeating a request with the same actor/key/payload produces one logical upload/promotion/job; reusing a key with a different payload conflicts. |
| ING-07 | A publisher can replace the file while a draft is unpublished. | Replacement increments the draft generation, creates a new upload, invalidates the prior preview, and prevents any stale verifier/renderer from promoting draft state. It never overwrites a published version. |

### 5.3 Rendering

| ID | Requirement | Acceptance criterion |
|---|---|---|
| REN-01 | Rendering is asynchronous and never executes notebook code. | A fixture that would create a file if executed renders without creating the file; renderer configuration contains no execution preprocessor. |
| REN-02 | The UI displays named source/render states: awaiting source, incoming uploaded, verifying, promoted, queued, validating, rendering, ready, failed, superseded. | Refreshing or reconnecting always resolves to durable server state and never an endless generic spinner. Moderation restriction is displayed separately. |
| REN-03 | The application owns inert cell structure and review controls while active/rich notebook outputs are isolated from the application origin. | Security tests prove code/plain text is escaped, Markdown follows the strict policy, active or ambiguous MIME types are sandboxed or replaced, and notebook scripts cannot read application cookies/storage, navigate top, or make arbitrary external requests. |
| REN-04 | Each rendered cell exposes its stable cell ID for comment anchoring. | Selecting a cell creates a thread attached to the expected version and cell ID. |
| REN-05 | A failed render retains the accepted original and gives an actionable message. | The publisher sees a public-safe failure explanation, a retry/replace action where appropriate, and a support code; operators see diagnostic context. |
| REN-06 | Duplicate, delayed, or lease-lost orchestrator delivery is safe. | Every lease attempt has a fencing token/generation; terminal writes compare lease token, job attempt, draft generation, and active upload. A stale attempt cannot mark a draft ready. |
| REN-07 | A published source version can receive a new derived render revision only for an audited security/compatibility reason. | Source bytes, version metadata, URL, digest, and threads remain unchanged; the page shows the active render policy/revision and regeneration event; revoked prior render artifacts are not served. |
| REN-08 | Rich outputs request short-lived capabilities on demand, including after initial page load. | A long notebook opened for more than the 60-second public capability lifetime can load a later output without full-page reload; issuance rechecks the active render and restrictions, and a restricted/revoked output never refreshes. |

### 5.4 Preview and publication

| ID | Requirement | Acceptance criterion |
|---|---|---|
| PUB-01 | Only a current ready, unrestricted draft generation can be previewed and published. | Publish rejects missing/processing/failed/superseded candidates, digest mismatch, or applicable restriction without changing visibility. |
| PUB-02 | Preview shows the exact candidate manifest/metadata through short-lived content-origin capabilities. | Preview capabilities expire, are scoped to one draft generation/render revision, use no content-origin cookies, and cannot expose another draft. Publication compares the previewed source and manifest digests. |
| PUB-03 | Publication creates an immutable version-specific URL and source record. | Version-bound source/metadata edits create a new version or are rejected. A security render revision may change only the derived projection under REN-07 and is disclosed; it never rewrites the source/version/review record. |
| PUB-04 | A stable notebook URL resolves to the latest published version while version URLs remain permanent. | `/@owner/slug` redirects or resolves canonically; `/@owner/slug/v/3` always returns version 3. |
| PUB-05 | Published pages display owner, version, digest, dates, license, kernel metadata, source/claim statement, and Callysto check labels. | Required provenance is present in UI and machine-readable metadata. |
| PUB-06 | A publisher can unlist a notebook without deleting the version record. | Unlisted pages disappear from discovery but continue to resolve for people with the URL; the audit log records the action. |
| PUB-07 | A scoped moderation restriction supersedes normal visibility. | New platform requests for a restricted notebook/version/render/comment return the defined neutral or tombstone state within the measured revocation SLO; raw/render delivery is blocked; audit and restoration paths exist. Callysto does not claim to recall bytes already downloaded. |
| PUB-08 | An owner can create a revised draft from a published version without mutating it. | The new draft copies eligible metadata, requires a `What changed?` summary before publication, and receives a new version number/digest. |
| PUB-09 | Every version page exposes version navigation and revision context. | Historical pages show a newer-version notice without replacing the artifact; the latest page links to prior versions and their change summaries. |
| PUB-10 | A revision can explicitly mark prior review threads as addressed without moving them. | The old thread remains on its original version and links to the addressing version; the new version can link back to the prior thread. |
| PUB-11 | Owner handle and notebook slug freeze at first publication. | Display-name edits do not change paths; every previously issued canonical/version URL continues to resolve. |
| PUB-12 | Publication requires a verified recovery copy of the accepted original. | Publish fails safely until the separately credentialed recovery location contains matching bytes/digest; derived output remains regenerable. |

### 5.5 Review

| ID | Requirement | Acceptance criterion |
|---|---|---|
| REV-01 | An authenticated member can start a notebook-level or cell-level thread. | The persisted thread stores notebook version, optional cell ID, author, body, and timestamps. |
| REV-02 | Comments support a deliberately small Markdown subset rendered safely. | Links, code, lists, and emphasis render; raw HTML and script payloads do not execute. |
| REV-03 | Threads support ordered replies without unbounded nesting. | Replies display chronologically in one thread; the API enforces a thread root rather than recursive depth. |
| REV-04 | Comment creation is idempotent and resistant to rapid resubmission. | Double-click and network retry create one comment. |
| REV-05 | The notebook owner can mark a reviewer thread `addressed`; the root thread author can mark it `resolved` or `reopened`; operators can moderation-close but not scientifically resolve it. | Authorization and event-language tests cover every capability/ownership/thread-authorship combination. |
| REV-06 | Comments remain attached to the original version. | Publishing a new version does not move or rewrite old threads. The new version may link back to unresolved prior threads. |
| REV-07 | If a normalized notebook lacks a cell referenced by a prior version, the old thread remains readable as an orphaned-version discussion. | No comment is silently re-anchored by cell index or text similarity. |
| REV-08 | Users can report a notebook or comment. | A report creates an operator-visible record without publicly exposing reporter identity. |
| REV-09 | A comment author can edit their own comment for 15 minutes; later correction uses an appended reply or visible revision history. | Edits show an `edited` marker and retain revision evidence; deletion leaves a tombstone; comment permalinks continue to resolve. |

### 5.6 Notifications

| ID | Requirement | Acceptance criterion |
|---|---|---|
| NOT-01 | The pilot can assign a named reviewer to a published notebook, send a version-specific review request, and record accept/decline. | The reviewer receives at most one logical notification per assignment; the deep link shows the exact version, owner, review question, and timing before idempotent accept/decline. Acceptance requires participation-ready contact and continues to the exact version. |
| NOT-02 | Owners receive notifications for new review threads and replies; thread participants receive relevant replies and state changes. | A fenced outbox with bounded attempts/dead-letter state covers delivery failure and duplicate event processing; no mutation is rolled back solely because email is unavailable. One logical event is guaranteed, but the UI/docs do not falsely promise exactly-once provider delivery. |
| NOT-03 | A user can disable non-essential review email while retaining security/account messages. | Preference changes are authenticated and honored before send; every optional message explains how to change the preference. |
| NOT-04 | Notification content contains no notebook source, comment body, presigned URL, private email list, or sensitive operator detail. | Snapshot and log-redaction tests enforce the minimal template and exact public deep link. |

The pilot does not require a general notification center, digest system, follower graph, or marketing email automation.

### 5.7 Browse, portability, and operations

| ID | Requirement | Acceptance criterion |
|---|---|---|
| DISC-01 | Homepage and `/explore` show real published records and never fabricate engagement. | Empty production data shows a purposeful pilot invitation. One separately stored static block labeled `Product demonstration` is permitted on the homepage but never appears in records, discovery, counts, profiles, analytics, or search metadata. |
| DISC-02 | Basic discovery supports recent order and exact topic filtering. | Pagination is cursor-based and stable under concurrent publication. |
| PORT-01 | Anyone can download the original public `.ipynb` as an attachment. | Response includes safe content disposition, `nosniff`, digest metadata, and no inline execution. |
| PORT-02 | Anyone can export public version metadata and public review threads as JSON; owners may separately export their private draft/account data under policy. | Public export schema is documented, stable/versioned, and fixture-tested without private email, reports, audit detail, or provider data. |
| OPS-01 | Operators can inspect job/report state, retry eligible failures, apply/restore scoped restrictions, revoke publisher capability, and suspend accounts without taking content ownership. | Each action requires authorized operator capability, recent reauthentication, reason, audit, and runbook; no UI supports self-elevation. |
| OPS-02 | The pilot records only the allowlisted events needed for predeclared success criteria. | Event schema/dictionary is versioned before cohort use; exports use participant pseudonyms and contain no raw notebook/comment content, email, provider token, IP, or arbitrary properties. |

## 6. State models

### 6.1 Draft and render state

```text
AWAITING_UPLOAD -> INCOMING_UPLOADED -> VERIFYING -> PROMOTED
                                              |          |
                                              v          v
                                            FAILED     QUEUED -> VALIDATING -> RENDERING -> READY
                                                                        |             |        |
                                                                        +-------------+------> FAILED

Any unpublished state --replace file--> increment draft generation + AWAITING_UPLOAD
READY --publish with expected generation/source/manifest--> PUBLISHED
ACTIVE DRAFT -> PUBLISHED or ABANDONED

Published render revision: ACTIVE -> REVOKED
Same immutable source may receive NEW_RENDER_REVISION -> ACTIVE through audited activation
```

`draft_lifecycle`, `render_status`, public `visibility` (`listed`, `unlisted`), and scoped `moderation_restriction` are separate concepts. The informal term “quarantine” is not a render state or a visibility enum value. A published version may coexist with a mutable new draft and may point to a later audited render revision without changing its source record.

### 6.2 Review thread state

```text
OPEN -> OWNER_ADDRESSED
OPEN or OWNER_ADDRESSED -> REVIEWER_RESOLVED -> REOPENED
REOPENED -> OWNER_ADDRESSED or REVIEWER_RESOLVED

moderation_status: VISIBLE <-> MODERATION_CLOSED (operator policy action from any review state)

Deletion is represented by a tombstone, not removal of the thread record.
```

`review_state` and `moderation_status` are orthogonal. Moderation close hides/disables participation according to policy but preserves whether the thread was open, owner-addressed, reviewer-resolved, or reopened; restoration returns to that preserved review state and never invents scientific resolution.

## 7. Trust language

### Allowed pilot labels

- **Format valid:** The upload parsed as a supported Jupyter notebook.
- **Render complete:** Callysto produced the displayed static representation without executing code.
- **Review discussion:** At least one public review thread exists.

### Forbidden without a later evidence system

- Verified
- Reproducible
- Independently reproduced
- Correct
- Peer reviewed

## 8. Limits and policies

Initial limits are configuration, not magic constants. They are enforced in the browser for feedback and again by the server/orchestrator/converter for security.

| Limit | Proposed pilot value | Behavior |
|---|---:|---|
| Original notebook size | 25 MiB | Reject before rendering; retain no public object. |
| Cells per notebook | 2,000 | Fail validation with a clear limit message. |
| Single decoded output | 10 MiB | Fail before unbounded expansion in memory; retain accepted original privately. |
| Total derived display payload | 50 MiB | Fail rendering and retain accepted original privately. Includes manifest plus decoded display assets/fragments; excludes the accepted original. |
| Title | 160 Unicode code points | Field error. |
| Description | 2,000 code points | Field error. |
| Comment | 10,000 code points | Field error; rate limits still apply. |
| Comment edit window | 15 minutes | Author may edit; later correction is a new visible record. |
| Topics | 8 | Normalize and reject unknown topics during pilot curation. |

Before public publishing, the repository must contain approved Terms, Privacy, Acceptable Use, Copyright/Removal, Content License, Retention, and Moderation policies. The product must warn uploaders not to publish secrets, credentials, private data, restricted datasets, or third-party content they cannot license.

Automated secret-pattern warnings are defense in depth. They must never be described as proof that an upload is safe.

## 9. Non-functional requirements

| Area | Requirement |
|---|---|
| Availability | Public reads have a proposed 99.9% monthly SLO after pilot launch; publishing may degrade separately without taking reads down. |
| Performance | p75 application page response under 1 second from the target region, excluding isolated notebook asset load; progress state visible within 500 ms of upload finalization. |
| Rendering | 95% of supported, in-limit pilot fixtures reach `ready` within 60 seconds after accepted-original promotion; failures are terminal and named rather than hanging. |
| Accessibility | Application UI meets WCAG 2.2 AA; all actions keyboard operable; focus visible; status changes announced; touch targets at least 44 × 44 CSS pixels. |
| Security | No notebook-controlled active content executes with application-origin authority. Every mutation has authentication, authorization, validation, rate limiting, CSRF protection where applicable, and audit context. |
| Privacy | Collect only identity, publication, review, security, and operational data needed for the service. No public email addresses. |
| Durability | Accepted originals are promoted to no-overwrite keys and backed up before publication; published source/version rows are immutable; database point-in-time recovery and object recovery/reconciliation are tested before launch. |
| Portability | Original notebook and review export remain downloadable in documented formats. |
| Observability | Each source-to-render flow carries a correlation ID across web, database job/fence, orchestrator, converter result, storage, and artifact metadata. |

## 10. Pilot success criteria

The pilot runs with a recruited cohort rather than an empty public launch.

### Minimum cohort

- Recruit a bounded cohort of 6–10 notebook owners and reviewers before opening the pilot.
- Import and publish at least 8 real notebooks tied to actual analyses, not demo fixtures.
- Assign at least one named reviewer to each notebook rather than relying on ambient discovery.

### Product evidence

- At least 80% of publishers reach a published notebook without operator intervention after invitation and onboarding.
- Median time from draft creation to a ready preview is under 10 minutes, including user metadata entry but excluding time spent fixing an invalid notebook.
- At least 7 substantive reviews are submitted by someone other than the notebook owner.
- At least 5 notebook owners reply, mark a thread addressed, or publish a revision in response.
- At least 3 notebooks are revised because of review feedback.
- At least 3 complete review loops occur: substantive review → owner response/address or linked revision → root reviewer resolves or reopens after seeing that response.
- At least 4 participants repeat a core action on a second notebook or review thread.
- In exit interviews, at least 6 participants say the contextual review record was materially better than their current method.
- No unresolved P0 security/privacy event and no silent loss of an accepted/recovery original, published version, or comment.

“Substantive” excludes test comments, praise-only comments, spam, and operator-created fixtures. The event definition must be encoded in the analytics dictionary before the pilot starts.

### Decision after pilot

- **Proceed:** review-loop targets are met and qualitative interviews identify repeated value.
- **Iterate:** publishing works but review participation is weak; improve recruitment, reviewer prompts, and notification before adding execution.
- **Stop or reframe:** users mainly want private hosting, authoring, or compute and do not use the public review record.

## 11. Launch gates

The pilot cannot open until all gates are green:

1. Product decisions approved in `DECISIONS.md`.
2. Clean install, lint, typecheck, unit, integration, E2E, Python, security, and production-build checks in CI.
3. Cross-origin notebook isolation tests pass in real browsers.
4. Backups and a documented restore exercise pass.
5. Promotion, render retry/fencing, poison-job, scoped restriction/render activation, and notification dead-letter runbooks are exercised in staging.
6. Required public policies are approved and linked.
7. The 6–10 participant owner/reviewer cohort is recruited, at least 8 candidate real notebooks are confirmed, and each notebook has a named reviewer assignment.
8. Production contains no mock notebook/review records, fabricated counts, or inert controls; any approved homepage demonstration is static, separately stored, and explicitly labeled.
9. Review assignment and transactional notification delivery are exercised in staging, including provider outage and duplicate-event behavior.
10. Incoming-object overwrite, stale-attempt fencing, draft replacement, preview/on-demand capability expiry, render-revision, and restriction/no-store tests pass in the deployed topology.

## 12. Approval record

On 2026-07-20 the owner accepted the choices below through D001-D024. The exact rationale and any
conditional feasibility gates remain authoritative in [`DECISIONS.md`](./DECISIONS.md).

1. Contextual comments are part of the MVP rather than Phase 2.
2. Publishing is invite-only for the pilot.
3. The Milestone 0 cohort-source audit uses the 80% rule to select direct upload or exact GitHub commit import; only one path will be built.
4. GitHub + ORCID are the pilot identity-provider direction, with the documented GitHub-only fallback if ORCID is blocked.
5. Content isolation and a separately provisioned content origin are mandatory.
6. The initial file limits are accepted as M0 values subject to corpus and provider proof.
7. Every notebook requires an explicit license, and policy/legal work must finish before public launch.
8. The pilot includes minimal transactional review email and defers a general notification center.
9. Resolution is reviewer-controlled; owners use `addressed`; comments have a 15-minute edit window.
10. Public handles/slugs are permanently frozen after first publication.
11. One clearly labeled static homepage product demonstration may exist before real pilot data.
12. The pilot has no notebook execution and no author-reported/reproducibility badge.
13. Incoming-to-accepted promotion, explicit draft/render-revision models, fenced jobs/generations, short on-demand capabilities/no-store, and a separate accepted-original recovery copy are mandatory boundaries.
14. Private contact is verified; publisher/operator capabilities are additive and non-possessory, including after publisher revocation.
15. The pilot success gates and proposed database/object recovery objectives are accepted subject to the explicit M0 provider proof.
