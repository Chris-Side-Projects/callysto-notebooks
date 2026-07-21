# Callysto architecture specification

- Status: **APPROVED FOR M0 FEASIBILITY — M1 IMPLEMENTATION GATED**
- Scope: invite-only publishing pilot
- Architecture posture: boring components, explicit boundaries, asynchronous rendering, hostile-input handling

## 1. Architecture decision

Keep the existing Next.js application as the public web and API service. Add one Python job orchestrator because the canonical Jupyter parsing/rendering libraries are Python-native. The orchestrator leases work and may reach only PostgreSQL and private R2. It invokes a separate credential-free conversion subprocess/container that receives local paths and has no network. Store metadata, review state, durable jobs, fences, restrictions, and outbox state in PostgreSQL. Store untrusted incoming objects, accepted originals, recovery copies, and immutable derived artifacts in private Cloudflare R2.

Present the notebook through an application-owned cell shell backed by a structured render manifest. The shell owns cell identity, navigation, selection, and review controls. It escapes code and plain text, renders only a tightly sanitized Markdown subset, and sends hostile or rich output types to per-cell sandboxed frames on a dedicated cookieless content origin. This avoids the impossible requirement for the application to inspect DOM inside a whole-notebook cross-origin iframe.

Do not add Redis, Kubernetes, a general event bus, or an execution cluster for the pilot. Milestone 0 must prove that the selected deployment can enforce the orchestrator/converter boundary; if Railway cannot, change the converter isolation technique or platform rather than weakening it.

M0 provider evidence reconciled on 2026-07-21 applies this rule: Railway compute is rejected for
lack of a documented destination allowlist. A nested Docker converter in ephemeral Vercel Sandbox
passed one no-network/non-root/read-only/secret-free happy-path slice, but the strengthened full
converter matrix has not run and the outer Vercel runtime reached link-local metadata under
`deny-all`; it is rejected for the credential-bearing orchestrator. The pilot orchestrator
platform/control plane remains unselected. See
[`docs/evidence/M0-vercel-sandbox-converter.md`](./docs/evidence/M0-vercel-sandbox-converter.md).

## 2. System context

```text
                                     ┌──────────────────────────────┐
                                     │ GitHub / ORCID OAuth        │
                                     └──────────────┬───────────────┘
                                                    │ callbacks
┌──────────────┐     HTTPS      ┌───────────────────▼──────────────────┐
│ Reader /     ├───────────────►│ Next.js web + Route Handler API     │
│ Publisher    │◄───────────────┤ pages, auth, drafts, review, ops     │
└──────┬───────┘                 └──────────┬────────────┬─────────────┘
       │ presigned PUT                      │            │
       │                                    │ SQL        │ signed render URL
       ▼                                    ▼            ▼
┌──────────────┐                       ┌──────────┐  ┌──────────────────────┐
│ Private R2   │◄─────────────────────►│PostgreSQL│  │ Content gateway      │
│ incoming,    │   allowlisted I/O     │metadata, │  │ signed short-lived   │
│ accepted,    │                       │jobs,     │  │ capabilities + CSP   │
│ recovery,    │                       │reviews   │  └──────────┬───────────┘
│ derived      │                       └────▲─────┘             │ rich output
└──────▲───────┘                            │ lease/fence        ▼
       │                              ┌─────┴────────────┐ per-output sandboxed frame
       └──────────────────────────────┤Job orchestrator  │
                                      │DB/R2 allowlist   │
                                      └──────┬───────────┘
                                             │ local paths only
                                      ┌──────▼───────────┐
                                      │Converter sandbox │
                                      │no secrets/network│
                                      │no execution      │
                                      └──────────────────┘
```

## 3. Repository structure

Preserve the root Next.js application rather than introducing workspace tooling before it is needed.

```text
app/                       Next.js pages and Route Handlers
components/                shared application UI
lib/
  auth/                    provider configuration and authorization helpers
  db/                      Drizzle schema, queries, transactions
  domain/                  state transitions and policy decisions
  storage/                 R2 interface and signed upload helpers
  validation/              shared request and metadata validation
renderer/
  pyproject.toml           pinned Python package and tooling
  callysto_renderer/       orchestrator, verification, leases, artifact promotion
  callysto_converter/      credential-free parsing/normalization/manifest export
  tests/fixtures/          safe, hostile, large, and malformed notebooks
contracts/                 JSON schemas shared between TypeScript and Python
drizzle/                   generated SQL migrations
tests/                     TypeScript unit/integration fixtures
e2e/                       Playwright user journeys and browser security tests
infra/                     deployment manifests and content-gateway configuration
docs/                      product, security, testing, operations
```

The orchestrator and converter are workers, not public network APIs. Only the orchestrator polls durable jobs and reads/writes R2 with bucket-scoped credentials. The converter cannot reach PostgreSQL, R2, cloud metadata, or the public network.

## 4. Core invariants

1. An incoming upload is untrusted and replaceable until a server-owned verifier streams, hashes, and promotes those bytes to a different no-overwrite accepted-original key.
2. Published versions are immutable.
3. Every public artifact maps to one version and one SHA-256 digest.
4. A notebook version has at most one active render revision; prior successful revisions remain auditable but cannot be served after revocation.
5. Converter sandboxes never execute notebook code and have no network or secrets.
6. Notebook-controlled HTML, SVG, JavaScript, widgets, and other active/rich formats never run with application-origin authority.
7. Comments target `version_id` and optionally `cell_id`, never a mutable notebook plus ordinal.
8. Publication is atomic: either version, cells, artifact pointers, and audit event become public together or none do.
9. Scoped restriction can stop new platform delivery of a notebook/version/render/comment within the documented capability-expiry SLO without destroying the accepted original or audit history; already downloaded bytes cannot be recalled.
10. Every state transition names its actor, cause, correlation ID, and time.
11. Every lease completion is fenced; a stale attempt or superseded draft generation cannot promote state.
12. A published source version may select a newer audited render revision for security/compatibility, but its source bytes, metadata, path, version cells, and review record do not change.

## 5. Ingestion and rendering pipeline

### 5.1 Happy path

```text
Create draft
  -> POST /api/drafts/:id/uploads
  -> authorize owner + publisher role
  -> increment/record draft generation; allocate unique opaque incoming key and upload row
  -> return short-lived presigned R2 PUT
  -> browser uploads untrusted incoming bytes with content type + advisory checksum
  -> POST /api/drafts/:id/uploads/:uploadId/finalize [idempotency key]
  -> HEAD incoming object for existence/coarse bounds; set VERIFYING; enqueue ingest job
  -> orchestrator leases ingest job with SELECT ... FOR UPDATE SKIP LOCKED + fence token
  -> stream incoming bytes once to fresh bounded temporary directory while computing SHA-256/size
  -> compare advisory digest; write the verified local bytes to a distinct no-overwrite accepted key
  -> CAS upload to PROMOTED and enqueue render job referencing accepted key/digest/storage identity
  -> orchestrator leases render job with a new fence token
  -> copy accepted original to a fresh bounded conversion directory
  -> invoke credential-free, no-network converter with local input/output paths
  -> parse JSON + validate nbformat + limits
  -> preserve original; write normalized copy with stable cell IDs
  -> build structured cell manifest without ExecutePreprocessor
  -> escape source/plain text, sanitize supported Markdown, classify every output MIME type
  -> write safe assets and isolated rich-output fragments under content-addressed keys
  -> store immutable render revision + cells + manifest
  -> fenced CAS: mark draft READY only if job lease, draft generation, and active upload still match
  -> preview service issues short-lived capability for the exact draft generation/render revision
```

### 5.2 Shadow paths

```text
INPUT                VALIDATE              TRANSFORM             PERSIST              DISPLAY
  |                     |                     |                     |                     |
  + nil/missing ------> reject 400, no key  |                     |                     |
  + incoming overwritten after finalize --> verifier promotes only streamed local bytes; later PUT irrelevant
  + empty file ----------------------------> INVALID_EMPTY ------> failure audit -----> replace action
  + wrong JSON ----------------------------> INVALID_JSON  ------> failure audit -----> named error
  + too large --------> reject/abort upload |                     |                     |
  + duplicate finalize --------------------> return existing ingest job (idempotent)   |
  + promotion write crash -----------------> no PROMOTED state; retry same digest safely|
  + invalid/duplicate cell IDs ------------> terminal validation failure -------------> named error
  + missing cell IDs ----------------------> deterministic IDs in normalized copy ----> preview notice
  + orchestrator crash --------------------> lease expires -> new fenced attempt ------► processing
  + stale attempt completion --------------> CAS rejects; artifacts orphan-swept ------► current state unchanged
  + file replaced during job -------------> draft generation CAS rejects old result --> current preview unchanged
  + unsupported rich output --------------> safe placeholder + manifest warning -----> explicit state
  + poison notebook -----------------------> max attempts -> terminal FAILED ---------> support code
  + R2 write failure ----------------------> no READY commit; retry safely ------------► processing
  + DB commit failure ---------------------> orphan derived object swept later --------► no false ready
  + scoped restriction ---------------------------------------------------------------> unavailable
```

## 6. Durable job model

`ingest_jobs`, `render_jobs`, and `notification_outbox` use the same PostgreSQL lease/fence protocol for the pilot. Product events and their jobs/outbox rows are committed atomically; external work occurs afterward.

Required fields:

```text
id, immutable_input_id, draft_id, draft_generation, status,
attempt_count, max_attempts, available_at,
lease_owner, lease_token, lease_generation, lease_expires_at,
last_error_code, last_error_detail_private,
created_at, started_at, finished_at, correlation_id
```

Worker algorithm:

1. Start transaction.
2. Select one eligible `queued` or lease-expired `processing` job using `FOR UPDATE SKIP LOCKED`.
3. Set `processing`, a fresh unguessable lease token, increment monotonic lease generation and attempt count, set expiry, commit.
4. Process outside the transaction.
5. Renew only with compare-and-set on job ID + lease token + lease generation; stop work after lease loss.
6. On success, atomically persist outcome and set job `succeeded` only with the same fence. Draft promotion additionally compares draft generation + active upload; publication additionally compares expected source + manifest digest.
7. On retryable failure, clear lease and set `available_at` using bounded exponential backoff with jitter.
8. On permanent validation failure or exhausted attempts, set terminal `failed` with a named public-safe code.

Job delivery is at least once. Every operation must therefore be idempotent and fenced. Artifact identity includes source digest plus renderer, output-policy, normalization, and manifest-schema versions. Writes are safe to repeat; state promotion is not permitted from a stale attempt.

An idempotency record is scoped to actor + operation + target + key and stores a canonical request hash plus result reference. Reusing a key with a different payload returns a conflict. Unique constraints cover finalize, publish, thread, comment, assignment, report, and notification event keys.

### Notification outbox dispatch

The product transaction writes one logical `notification_outbox` row with a unique event key. A dispatcher leases it with the same token/generation fencing protocol, checks the recipient's current verified address and preference at send time, and submits a provider idempotency key when supported. On provider acceptance it stores the provider message ID and marks sent using the fence. If the process crashes after provider acceptance but before acknowledgment, a retry may produce a duplicate provider delivery; the event remains one logical notification and templates are safe under duplication. Bounded failures enter `dead_lettered` state and alert an operator without rolling back the comment, assignment, or thread event.

## 7. Notebook normalization

- Parse with current supported `nbformat` and validate against the declared major version.
- Never overwrite or “repair” the original upload.
- Preserve existing cell IDs only when each is valid and unique. Reject invalid or duplicate IDs. Missing IDs may be generated; a mixed notebook preserves valid IDs and generates only missing ones after collision checking.
- Deterministic generated-ID algorithm `callysto-cell-id-v1`:

```text
accepted_original_bytes =
    the exact byte sequence streamed, verified, and promoted to the immutable
    accepted-original object

accepted_original_sha256_bytes =
    SHA256(accepted_original_bytes)  // the 32 binary digest bytes, not hex text

cell_source_text =
    if cell.source is a JSON string: that decoded string
    if cell.source is an array of strings: concatenate elements in order with no separator
    otherwise: validation failure

cell_source_utf8 =
    UTF8(cell_source_text)
    // no Unicode normalization, newline conversion, trimming, or added trailing newline

cell_source_sha256_bytes =
    SHA256(cell_source_utf8)  // 32 binary bytes

payload =
    UTF8("callysto-cell-id-v1") || 0x00
    || accepted_original_sha256_bytes
    || uint64_be(zero_based_cell_ordinal)
    || 0x00 || UTF8(validated_cell_type)
    || 0x00 || cell_source_sha256_bytes

cell_id =
    "cly_" || lowercase_rfc4648_base32_no_padding(SHA256(payload))
```

Every `SHA256(...)` value concatenated into `payload` is the 32-byte binary digest. Hexadecimal is for storage, logs, manifests, and test-vector display only; implementations must not concatenate the 64 ASCII hex characters. `cell_type` is exactly one of `code`, `markdown`, or `raw`. The ordinal is the zero-based position in the accepted notebook's `cells` array. The resulting ID is 56 characters: `cly_` followed by 52 lowercase RFC 4648 Base32 characters. The algorithm has no secret or collision counter. A generated collision with any preserved or generated ID is a terminal normalization failure.

Changing any accepted-original byte, including unrelated metadata or JSON formatting, changes every generated ID. This is intentional: review anchors are version-bound. Array and string source forms that decode to the same logical source have the same cell-source hash but different final IDs when their accepted-original bytes differ. [`contracts/callysto-cell-id-v1-vectors.json`](./contracts/callysto-cell-id-v1-vectors.json) is the normative cross-language vector set.

- Persist cell ID, ordinal, type, and cell-source SHA-256 in `cell_snapshots`.
- Strip transient metadata only from the normalized/render copy according to a versioned allow/deny policy. Record each normalization action in the manifest.
- The render manifest contains display-safe structured cells, supported asset references, isolated-output references, output policy decisions, and renderer/policy versions. It never contains executable notebook code as an instruction to the browser.
- Do not trust notebook signatures from another machine as proof of safe output.

## 8. Render and interaction security boundary

Jupyter notebooks can contain rich HTML and JavaScript outputs. Jupyter’s own trust model treats untrusted HTML and JavaScript specially. Callysto must assume every upload is untrusted regardless of the uploader’s account.

### Application-owned cell shell

Cell-level review requires the application to own the cell wrapper, anchor, selected state, and `Discuss` control. It must not use DOM access or a capability-bearing `postMessage` bridge into a whole-notebook iframe.

- Code source and `text/plain` outputs render as escaped text, never `dangerouslySetInnerHTML`.
- Markdown is converted with raw HTML disabled and then passed through a versioned strict allowlist. Links receive safe schemes and attributes; remote images are not fetched during rendering.
- Ordinary PNG/JPEG assets are served from immutable content-origin URLs and displayed by the application only after verified MIME/type metadata.
- HTML, SVG, widget state, JavaScript, and any ambiguous or active format are either rendered inside a per-output sandboxed iframe on the content origin or replaced by an explicit unsupported-output placeholder.
- The application treats the manifest as untrusted input and validates it against a versioned JSON schema before use.
- Cell selection, review markers, navigation, and comments operate on manifest cell IDs; they never depend on inspecting output-frame DOM.

This boundary preserves contextual interaction while keeping active notebook content out of the application origin.

### Required infrastructure and conversion controls

- Renderer uses `nbconvert` as an exporter only. No kernel startup and no `ExecutePreprocessor`.
- Orchestrator runs as non-root with a read-only image, bounded temporary storage, no application/session/OAuth credentials, and network allowlisted only to PostgreSQL and private R2 endpoints; cloud metadata and public internet are denied.
- Conversion runs as a separate non-root child sandbox/container with local input/output paths, bounded CPU/memory/process/file/disk/time, no secrets, and no network namespace. It cannot retrieve remote images, styles, scripts, datasets, or URLs.
- Rich output fragments are served on a separate origin that receives no Callysto session cookies.
- Application embeds each rich fragment using an iframe `sandbox` without `allow-scripts`, `allow-same-origin`, `allow-forms`, `allow-popups`, or top-navigation permissions. The frame has a descriptive title and a bounded height/scroll policy; no bridge is required for review interactions.
- Content gateway returns a restrictive CSP such as:

```text
default-src 'none';
style-src 'unsafe-inline';
img-src data: blob:;
font-src data:;
media-src data: blob:;
frame-ancestors https://callysto.io https://staging.callysto.io;
form-action 'none';
base-uri 'none';
```

- Also send `X-Content-Type-Options: nosniff`, a restrictive `Permissions-Policy`, `Referrer-Policy: no-referrer`, and the pilot's explicit `private, no-store` artifact policy.
- Raw notebooks are private R2 objects served through an authorized gateway as `application/octet-stream` with `Content-Disposition: attachment` and `nosniff`.
- Notebook Markdown and Markdown comments use separate allowlisted policies that strip raw HTML and unsafe URLs.

The safe fallback for an unsupported rich output is a labeled placeholder plus an escaped plain-text representation when one exists, not enabling scripts or relaxing the application policy.

### Content origin

Use a Cloudflare Worker on a dedicated `workers.dev` hostname for staging. Give it access to private
derived artifacts only through the approved Get/Head-only broker or a provider-enforced SigV4 read
identity with no list, write, or delete authority; a direct Worker R2 binding is not accepted for
this boundary. Before public launch, provision either that approved isolated hostname or a separate
registrable content domain. Do not use an `r2.dev` public bucket endpoint for production.

The application signs short-lived `cly-content-capability-v2` capabilities containing only an opaque render revision/output ID, the SHA-256 digest of the exact immutable content-index bytes, audience (`public` or exact draft preview), and expiry. The application sources that digest from the active server-authoritative render revision, never from the browser. The gateway verifies the signature, requires expiry to remain within the audience maximum relative to its own current time, derives `manifests/{render_revision_id}/{content_index_sha256}.json`, verifies the retrieved index bytes against the signed digest before parsing, and resolves only identifiers in that index. Content-index JSON must be the canonical compact serialization, with at most one terminal LF; byte-for-byte canonical reserialization rejects duplicate keys, alternate escapes, whitespace variants, and parser-differential inputs before schema validation. It never accepts arbitrary R2 keys or user-controlled paths and receives no application cookies.

- Public capabilities live for at most 60 seconds in the pilot, measured against gateway current time as well as signed issue/expiry timestamps.
- Draft-preview capabilities live for at most 5 minutes and bind draft ID + generation + render revision + content-index digest; they are bearer capabilities shown only after application authorization.
- The app shell requests an output capability on demand when a rich output approaches the viewport or when an expired request is retried. The public issuance endpoint rechecks that the output belongs to the version's current active unrestricted render; draft issuance rechecks owner authorization plus exact draft generation/revision. The manifest never contains a long-lived bearer URL.
- User artifacts return `Cache-Control: private, no-store` during the pilot. CDN caching of revocable content is disabled until purge/revocation semantics have their own approved design.
- A moderation restriction stops issuance of new capabilities; previously issued ones expire within the measured 60-second revocation SLO. Already downloaded bytes cannot be recalled.
- Restoration re-enables capability issuance or activates a new audited render revision. It never silently erases the restriction event.

## 9. Data model

### Identity

```text
users
  id, public_handle, handle_frozen_at, display_name, avatar_url, bio,
  created_at, suspended_at

user_roles
  user_id, role (`publisher` | `operator`), granted_by, granted_at, revoked_at

user_emails
  id, user_id, normalized_email_encrypted, email_lookup_hmac,
  email_lookup_key_version,
  verified_at, source, is_notification_primary, created_at

accounts / sessions / verification_tokens
  Auth.js adapter-compatible provider identity and session records

publisher_invitations
  id, email_or_provider_hint, token_digest, invited_by, expires_at, accepted_by, accepted_at, revoked_at
```

`member` is implicit for an active authenticated account; publisher/operator are independent capabilities. Operator bootstrap uses an offline migration/one-time administrative procedure, never a self-elevation API. Sensitive operator actions require recent reauthentication and an operational MFA requirement. No public user record contains email or OAuth access tokens. Provider tokens are encrypted at rest if retained; do not retain scopes/tokens the product does not need.

`email_lookup_hmac` is HMAC-SHA-256 over the canonical normalized address with a dedicated versioned secret lookup key. It is never a bare deterministic hash, which would make common addresses enumerable. Equality lookup spans the active key version during rotation; decryption and re-HMAC occur only in the controlled migration path.

### Artifacts

```text
notebooks
  id, owner_id, slug, slug_frozen_at, visibility (`listed` | `unlisted`),
  latest_published_version_id, created_at, updated_at

notebook_drafts
  id, notebook_id nullable, owner_id, base_version_id nullable,
  draft_generation, lifecycle_status, active_upload_id nullable,
  candidate_render_revision_id nullable,
  expected_source_sha256 nullable, expected_manifest_sha256 nullable,
  title, description, review_question, source_statement,
  study_url, dataset_url, license_spdx, change_summary,
  created_at, updated_at, published_version_id nullable

notebook_versions
  id, notebook_id, version_number, title, description,
  review_question, source_statement, study_url, dataset_url,
  license_spdx, change_summary, base_version_id nullable,
  accepted_original_id, source_sha256, initial_render_revision_id,
  kernel_language, kernel_name, nbformat_major, nbformat_minor,
  published_at, created_at

uploads
  id, draft_id, draft_generation, owner_id, incoming_object_key,
  original_filename, browser_sha256 nullable, verified_sha256 nullable,
  verified_byte_size nullable, incoming_etag nullable,
  accepted_original_id nullable, status, created_at, finalized_at, promoted_at

accepted_originals
  id, immutable_object_key, source_sha256, byte_size, storage_identity,
  recovery_status, recovery_object_key nullable, created_at

ingest_jobs / render_jobs
  common fenced lease fields defined in Section 6

render_revisions
  id, accepted_original_id, source_sha256, normalized_sha256,
  manifest_key, manifest_sha256, content_index_key, content_index_sha256,
  renderer_version, output_policy_version,
  normalization_version, manifest_schema_version, status,
  created_at, revoked_at nullable

render_cells
  render_revision_id, cell_id, ordinal, cell_type, cell_source_sha256
  UNIQUE(render_revision_id, cell_id), UNIQUE(render_revision_id, ordinal)

version_cells
  version_id, cell_id, ordinal, cell_type, cell_source_sha256
  UNIQUE(version_id, cell_id), UNIQUE(version_id, ordinal)

version_render_activations
  id, version_id, render_revision_id, reason_code,
  activated_by, activated_at, deactivated_at nullable

topics / notebook_version_topics
  curated topic vocabulary and versioned assignments

artifact_recovery_copies
  accepted_original_id, recovery_location, object_identity,
  verified_sha256, verified_at
```

Draft rows are mutable under optimistic generation checks; version rows and `version_cells` are immutable. Publication assigns/fixes owner handle and notebook slug, verifies the accepted-original recovery copy, inserts the version and cells, activates the initial render revision, advances the latest pointer, consumes the draft, and writes the audit event atomically. A later security render activation changes only the derived projection and is visibly/auditably recorded. Metadata belongs to the version when changing it could alter interpretation or citation. Display name/biography may remain mutable.

### Review and operations

```text
review_threads
  id, version_id, cell_id nullable, author_id,
  review_state, moderation_status,
  owner_addressed_at nullable, owner_addressed_by nullable,
  resolved_at nullable, resolved_by nullable,
  moderation_closed_at nullable, moderation_closed_by nullable,
  moderation_reason_code nullable, moderation_restored_at nullable,
  moderation_restored_by nullable, created_at, updated_at

comments
  id, thread_id, author_id, body_source, body_html_safe,
  created_at, edited_at, deleted_at

comment_revisions
  id, comment_id, body_source, body_html_safe, created_at

version_thread_links
  thread_id, addressed_in_version_id, linked_by_owner_id, created_at

content_reports
  id, target_type, target_id, reporter_id, reason_code,
  details, status, assigned_to, created_at, resolved_at

audit_events
  id, actor_type, actor_id nullable, action, target_type, target_id,
  correlation_id, metadata_redacted_json, created_at

moderation_restrictions
  id, target_type, target_id, reason_code, public_reason_code nullable,
  imposed_by, imposed_at, lifted_by nullable, lifted_at nullable

idempotency_records
  actor_id, operation, target_id, idempotency_key,
  canonical_request_sha256, result_type, result_id, created_at
  UNIQUE(actor_id, operation, target_id, idempotency_key)

review_assignments
  id, version_id, reviewer_id, assigned_by, status,
  created_at, accepted_at, declined_at, completed_at

notification_preferences
  user_id, review_email_enabled, updated_at

notification_outbox
  id, event_key unique, recipient_id, template, public_target_json,
  status, attempt_count, max_attempts, available_at,
  lease_token, lease_generation, lease_expires_at,
  provider_message_id nullable, sent_at, dead_lettered_at, last_error_code

pilot_events
  id, event_type, cohort_id, actor_pseudonym, notebook_id nullable,
  version_id nullable, thread_id nullable, properties_allowlist_json,
  occurred_at, analytics_dictionary_version
```

Notification delivery is at least once. `event_key` deduplicates logical events, and provider idempotency is used when available, but a crash after provider acceptance may still create duplicate email; templates and product language do not promise exactly-once delivery. Comment edits retain revisions and visible edited timestamps. Hard deletion is a policy operation, not ordinary UI behavior. Pilot events contain no raw email, notebook/comment body, source, provider token, IP, or arbitrary properties; the dictionary defines each allowlisted field and retention.

Required database constraints include one frozen `(owner_id, slug)` identity per notebook, unique `(notebook_id, version_number)`, no more than one non-deactivated render activation per version, immutable version/source linkage after publish, one active primary notification email per user, valid restriction target type/target identity, and foreign keys that prevent version/thread/render/recovery records from silently orphaning. State transitions run through domain functions and database transactions; direct ad hoc status updates are not an implementation shortcut.

## 10. API surface

All mutation requests validate authentication, authorization, CSRF posture, input schema, rate limit, and idempotency where applicable.

```text
GET    /api/notebooks?cursor=&topic=                    public discovery
GET    /api/notebooks/:id/versions/:version             public metadata/review summary
GET    /api/versions/:id/original                       public attachment for published/unlisted unrestricted version
GET    /api/versions/:id/export                         public metadata + public review JSON
POST   /api/versions/:id/outputs/:outputId/capability   public, current active unrestricted render, rate-limited

GET    /api/drafts/:id                                  owner publisher
POST   /api/drafts                                      publisher, idempotent
PATCH  /api/drafts/:id                                  owner + expected generation
POST   /api/versions/:id/revisions                      owner publisher; creates draft
POST   /api/drafts/:id/uploads                          owner publisher, idempotent
POST   /api/drafts/:id/uploads/:uploadId/finalize       owner publisher, idempotent
POST   /api/drafts/:id/render/retry                     owner/operator, eligibility checked
POST   /api/drafts/:id/outputs/:outputId/capability     owner + exact generation/revision
POST   /api/drafts/:id/publish                          owner + expected generation/digests, idempotent
POST   /api/notebooks/:id/unlist                        owner, idempotent
POST   /api/notebooks/:id/relist                        owner publisher, idempotent

POST   /api/versions/:id/threads                        participation-ready member, idempotent
POST   /api/threads/:id/comments                        participation-ready member, idempotent
PATCH  /api/comments/:id                                comment author within 15 minutes
DELETE /api/comments/:id                                author/operator policy tombstone
POST   /api/threads/:id/address                         notebook owner, optional version link
POST   /api/threads/:id/resolve                         root thread author
POST   /api/threads/:id/reopen                          root thread author
POST   /api/reports                                     participation-ready member, idempotent
POST   /api/review-assignments/:id/accept               assigned reviewer, idempotent
POST   /api/review-assignments/:id/decline              assigned reviewer, idempotent

GET    /api/settings/identity                           signed-in user
POST   /api/settings/identity/link/:provider            signed-in + second OAuth flow
POST   /api/settings/email/verify                       signed-in, rate-limited/idempotent
POST   /api/invitations/:token/accept                   signed-in, idempotent
GET    /api/settings/notifications                      signed-in user
PATCH  /api/settings/notifications                      signed-in user
POST   /api/settings/export                             signed-in user, policy-scoped/idempotent

GET    /api/ops/jobs                                    operator + recent reauth
GET    /api/ops/reports                                 operator + recent reauth
POST   /api/ops/invitations                             operator + recent reauth
POST   /api/ops/publishers/:userId/revoke               operator + reason + recent reauth
POST   /api/ops/users/:userId/suspend                   operator + reason + recent reauth
POST   /api/ops/users/:userId/restore                   operator + reason + recent reauth
POST   /api/ops/restrictions                            operator + reason + recent reauth
POST   /api/ops/restrictions/:id/lift                   operator + reason + recent reauth
POST   /api/ops/render-revisions/:id/revoke             operator + reason + recent reauth
POST   /api/ops/versions/:id/render-activations         operator + approved revision + reason + recent reauth
POST   /api/ops/threads/:id/moderation-close            operator + reason + recent reauth
POST   /api/ops/threads/:id/moderation-restore          operator + reason + recent reauth
POST   /api/ops/reports/:id/resolve                     operator + disposition + recent reauth
POST   /api/ops/jobs/:id/retry                          operator + eligibility + recent reauth
POST   /api/ops/review-assignments                      operator + exact version/reviewer + recent reauth
```

Prefer Route Handlers for HTTP APIs and server components for reads. Never trust a server action or hidden UI control as an authorization boundary; authorization lives in shared server-only domain functions.

## 11. Authorization matrix

| Action | Logged out | Participation-ready member | Publisher, non-owner | Owner, publisher revoked | Owner publisher | Operator, non-owner |
|---|---:|---:|---:|---:|---:|---:|
| Read published | yes | yes | yes | yes | yes | yes |
| Read unlisted with URL | yes | yes | yes | yes | yes | yes |
| Comment/report | no | yes | yes | yes | yes | yes |
| Create a draft | no | no | yes | no | yes | no |
| Edit/upload/publish owned draft | no | no | no | no | yes | no |
| Read/export owned work | no | no | no | yes | yes | no |
| Unlist owned notebook | no | no | no | yes | yes | no |
| Relist owned notebook | no | no | no | no | yes | no |
| Mark owned-notebook reviewer thread addressed | no | no | no | yes | yes | no |
| Resolve/reopen thread | no | if root author | if root author | if root author | if root author | if root author |
| Moderation-close/restrict/restore | no | no | no | no | no | yes |
| Invite/revoke publisher, suspend user, retry any eligible job | no | no | no | no | no | yes |

Capabilities compose. An operator who separately has publisher capability and owns a draft may act as that owner, but operator capability alone never grants content possession. Revoking publisher capability makes unpublished drafts read-only and blocks new publication; it does not transfer ownership, alter public versions, or remove the active owner's reply/address, export, unlist, and policy-removal rights. Suspension is a separate state and blocks ordinary mutations. Every object lookup scopes by both target ID and authorized relationship to prevent insecure direct-object reference.

A signed-in user whose private contact is not yet verified is not participation-ready and has read-only access. Thread `review_state` and `moderation_status` are independent: an operator may moderation-close or restore from any review state, and restoration exposes the preserved scientific state rather than changing it.

## 12. Error and rescue registry

| Codepath | Named failure | Retry? | Rescue/action | User sees | Logged/metric |
|---|---|---:|---|---|---|
| OAuth callback | `OAuthStateMismatch` | no | Reject; clear transient state | Sign-in could not be completed | security log + counter |
| OAuth callback | `ProviderUnavailable` | yes | Preserve return URL; retry | Provider temporarily unavailable | provider/error metric |
| Account link | `IdentityCollision` | no | Block automatic merge; support flow | Accounts could not be linked safely | security audit |
| Create upload | `PublisherInviteRequired` | no | No key issued | Invitation required | authorization metric |
| Browser upload | `UploadUrlExpired` | yes | Issue new URL after ownership check | Upload link expired; retry | upload/error metric |
| Finalize upload | `ObjectMissing` | yes | HEAD retry then remain draft | Upload not found; retry | correlation log |
| Ingest verify | `ChecksumMismatch` | no | Never promote incoming object; lifecycle cleanup | File differs from the uploaded digest; upload again | security + integrity metric |
| Ingest promote | `OriginalPromotionFailed` | yes | Retry conditional write from verified local bytes; no accepted pointer until success | Verification delayed | storage alert |
| Validation | `NotebookJsonInvalid` | no | Terminal failed state | Not a valid notebook | failure code metric |
| Validation | `NotebookLimitExceeded` | no | Terminal failed state | Exact exceeded limit | limit metric |
| Validation | `NbformatUnsupported` | no | Terminal failed state | Unsupported notebook version | format metric |
| Validation | `DuplicateCellId` | no | Terminal failed state | Duplicate cell identifiers | validation metric |
| Normalize | `NormalizationFailed` | no | Preserve original; fail | Could not prepare notebook | converter error + support code |
| Render | `RenderTimeout` | bounded | Retry once; then terminal | Rendering timed out | duration + timeout alert |
| Render | `RenderMemoryExceeded` | no | Kill conversion task; terminal | Notebook exceeds render limits | resource metric |
| Output policy | `RichOutputUnsupported` | no | Emit bounded placeholder; continue if safe | Output is not displayed in this static render | output-policy metric |
| Manifest read | `RenderManifestInvalid` | no | Refuse application rendering; restrict/revoke derived artifact | Content unavailable | security alert |
| R2 read/write | `ArtifactStorageUnavailable` | yes | Backoff; do not commit ready | Processing delayed | storage alert |
| DB lease | `JobLeaseLost` | yes | Stop work; another fenced attempt owns it | Processing continues | orchestrator warning |
| Draft promotion | `DraftGenerationSuperseded` | no | Keep artifacts orphan-eligible; never update draft | A newer upload is already active | stale-attempt metric |
| Publish | `RenderNotReady` | no | Reject transaction | Preview must finish first | domain rejection metric |
| Publish | `PublishConflict` | no | Return existing version if idempotent; otherwise refresh | Draft changed; review latest preview | conflict metric |
| Preview | `PreviewCapabilityExpired` | yes | Reauthorize current generation; never extend stale preview | Preview link expired; refresh | preview metric |
| Thread create | `CellAnchorMissing` | no | Reject; never substitute index | Cell is unavailable in this version | review error metric |
| Comment create | `RateLimitExceeded` | later | Preserve local draft | Try again after stated time | abuse metric |
| Comment create | `SessionExpired` | yes after auth | Preserve local draft | Sign in to finish posting | auth/error metric |
| Notification | `DeliveryUnavailable` | bounded | Keep fenced outbox row; back off; dead-letter after max attempts without reverting product event | Review saved; delivery delayed | delivery alert/metric |
| Notification | `ProviderAckUnknown` | bounded | Reuse provider idempotency key where supported; accept possible duplicate rather than lose logical event | Review saved; delivery status uncertain | delivery audit |
| Content gateway | `RenderRevoked` | no | Return neutral unavailable document | Content unavailable | access audit |
| Content gateway | `CapabilityExpired` | yes via application | Refuse artifact; require fresh authorized page request | Content link expired | gateway metric |
| Export | `ExportGenerationFailed` | yes | No partial download | Export could not be prepared | export error metric |

No catch-all failure is allowed to mark a job successful. Unexpected exceptions add context, set a safe state if possible, emit an alert, and remain visible to operators.

## 13. Threat model

| Threat | Likelihood | Impact | Required mitigation |
|---|---|---|---|
| Stored XSS in notebook output | High | High | Escaped app shell, strict Markdown policy, schema-validated manifest, separate-origin output frames, sandbox without scripts/same-origin, CSP, browser security tests. |
| Sanitizer or MIME confusion bypass | Medium | High | Raw HTML disabled, versioned allowlist, verified MIME mapping, active/ambiguous types isolated or rejected, regression corpus. |
| SSRF during conversion | Medium | High | Credential-free converter has no network; orchestrator egress allowlists only PostgreSQL/R2. Exact-commit import, if selected, uses a separate restricted fetcher contract. |
| Zip/base64 decompression or memory bomb | Medium | High | Encoded/decoded and total-output limits before expansion; conversion memory/time cap. |
| Secret/PII publication | Medium | High | Publisher warnings, pattern warning, preview/attestation, report/scoped-restriction process. |
| Cross-account draft mutation | Medium | High | Ownership-scoped queries and authorization matrix tests. |
| Presigned upload abuse/overwrite | Medium | High | Unique incoming key, short expiry/quotas, server-side streaming hash, promotion to different no-overwrite accepted key, draft-generation CAS, lifecycle cleanup. |
| Stale attempt commits | Medium | High | Lease token/generation fencing plus active upload/draft generation compare-and-set. |
| Restricted artifact remains cached | Medium | High | Short signed capabilities with gateway-current-time bounds, no-store user artifacts, measured ≤60-second issuance/expiry SLO; no recall claim for downloaded bytes. |
| Content index or artifact substituted after capability issuance | Low-medium | High | Capability signs the exact content-index SHA-256; gateway derives its content-addressed key, re-hashes index bytes before parsing, and separately verifies artifact size/digest. |
| Comment spam/harassment | High after launch | Medium | Authentication, rate limits, report flow, operator moderation, audit trail. |
| Copyright/license violation | Medium | High | Required license/rights attestation, takedown policy, scoped restriction, retained audit. |
| OAuth account takeover/link confusion | Low-medium | High | State/PKCE where supported, secure host-only cookies, explicit linking, no email-only merge. |
| Supply-chain compromise | Medium | High | Lockfiles, pinned Python dependencies with hashes where practical, dependency scanning, SBOM/release record. |
| Public-object key guessing | Low | Medium | Opaque IDs, gateway allowlist/path validation, no bucket listing. |

Security-specific implementation details live in `docs/SECURITY.md`; those controls are part of this architecture's acceptance contract.

## 14. Performance and scaling

Pilot design target, not an unearned scale claim:

- Web reads: cursor pagination, indexed published/version/topic queries, no per-row author or thread N+1 queries.
- Rendering: one orchestrator with configured conversion concurrency based on memory; horizontal replicas safely lease different jobs using fences.
- Top expected slow paths: notebook upload, render, and isolated artifact load. All are off or separable from metadata page response.
- Do not CDN/browser-cache user artifacts in the pilot; signed capability and restriction correctness outrank cache efficiency. Public metadata may be cached briefly with version/restriction-aware invalidation.
- No notebook object is loaded into the Next.js web process during direct upload.
- Enforce 25 MiB source and 50 MiB total derived-display limits regardless of R2’s much larger platform limits.

At 10× pilot load, add orchestrator/converter replicas and tune indexes. At 100×, measure PostgreSQL queue contention before introducing a dedicated queue. Redis is a response to measured contention, not a roadmap ornament.

## 15. Observability

### Structured events

- `draft.created`
- `upload.authorized`, `upload.finalized`, `upload.verifying`, `upload.promoted`, `upload.rejected`
- `render.queued`, `render.started`, `render.retried`, `render.ready`, `render.failed`, `render.fence_rejected`, `render.activated`, `render.revoked`
- `version.published`, `version.unlisted`, `restriction.imposed`, `restriction.lifted`
- `thread.created`, `comment.created`, `thread.addressed`, `thread.resolved`, `thread.reopened`, `thread.moderation_closed`
- `review.assigned`, `notification.queued`, `notification.sent`, `notification.failed`, `notification.dead_lettered`
- `report.created`, `report.resolved`

Every event includes correlation ID, target IDs, actor ID where appropriate, duration/status, and a redacted error code. Never log notebook source, comment body, OAuth token, presigned URL, session cookie, raw email, or rendered rich-output body.

### Metrics and alerts

- Render queue depth and oldest queued age.
- Render success/failure/timeout by renderer version and failure code.
- Upload finalize/checksum failures.
- Ingest promotion latency/failure and stale-fence/draft-generation rejections.
- Publish success and time from draft to ready/published.
- Content gateway 4xx/5xx and CSP report samples.
- Restriction-to-last-valid-capability expiry time, target ≤60 seconds.
- Comment/report rate-limit actions.
- Backup age and restore-check status.

Alert when the oldest render job breaches the pilot SLO, terminal render failure rate spikes, content gateway 5xx exceeds threshold, no recent backup exists, or a security event class fires.

## 16. Deployment and rollback

### Environments

- Local: Next.js, local PostgreSQL, filesystem-backed fake object storage, local mail sink, orchestrator, and a locally enforceable no-network converter sandbox.
- Test: ephemeral database and deterministic fake storage; no public provider/network dependency.
- Staging: a selected platform that passes D013's exact PostgreSQL/R2-only plus metadata-denial
  proof, real PostgreSQL/service topology, separated primary/recovery R2 identities, OAuth
  sandbox/test applications, and a staging content gateway. Current Railway and Vercel outer
  compute candidates do not pass the orchestrator condition.
- Production: separate credentials, bucket, database, hostnames, and alert routes.

### Deployment order

```text
backward-compatible DB migration
  -> deploy content gateway if contract changes
  -> deploy orchestrator/converter compatible with old + new job/render rows
  -> deploy web/API behind disabled feature flag
  -> smoke test
  -> enable for operator
  -> enable for invited publishers
```

### Rollback

```text
bad web release?       disable publish flag -> roll back web image
bad renderer release?  stop new leases -> roll back orchestrator/converter -> requeue eligible jobs
bad migration?         use forward fix where data changed; rollback only proven reversible DDL
unsafe render?         restrict/revoke derived artifact -> retain original -> patch -> rerender
content outage?        metadata page remains available with explicit artifact-unavailable state
```

Published originals are never deleted as a deployment rollback tactic.

### Recovery objectives and proof

Proposed pilot objectives, subject to the Milestone 0 provider proof:

- PostgreSQL point-in-time recovery: RPO ≤15 minutes and RTO ≤8 hours.
- Accepted originals for a published version: RPO 0 after publication. Publication is blocked until a SHA-verified recovery copy exists in a separately credentialed recovery location that normal app/orchestrator credentials cannot delete.
- Derived manifests/outputs: regenerable from the accepted original plus pinned renderer/policy/schema versions; recovery evidence samples digest equality.
- Incoming objects and unpublished drafts: documented best-effort retention; they are not represented as durable publication records.

Before launch, restore the database into an isolated environment at a chosen point, attach the recovery-object inventory, verify sampled original/source digests and version/thread/render relationships, regenerate a derived render, and measure actual RPO/RTO. If Railway/R2 topology cannot meet these targets, change the service plan/topology or obtain owner acceptance of a weaker explicit objective before pilot data exists.

## 17. Alternatives considered

| Approach | Benefit | Cost/risk | Decision |
|---|---|---|---|
| Direct upload + promoted snapshot | Broadest pilot access; simplest publisher mental model; accepted byte preservation | Owns storage/promotion earlier | Default if cohort Git/access threshold is not met. |
| GitHub-exact-commit review layer | Reuses Git hosting/versioning; faster for Git-native users | Competes with ReviewNB; excludes non-Git users; fetch/API/SSRF/rate-limit surface | Select only if M0 cohort evidence meets D003; amend source contracts before M3. |
| Full compute capsule | Stronger reproducibility evidence | Data/environment/compute/security scope becomes the product | Defer; integrate standards/providers rather than build in pilot. |
| Synchronous render in web request | Fewer components | Timeouts, poor retries, web resource exhaustion, unclear state | Rejected. |
| Redis/BullMQ plus Python renderer API | Mature queue semantics | Extra service and cross-language network API before load | Rejected for pilot. |
| Client-side Pyodide execution | No server compute for compatible notebooks | Package/browser limitations and a different security/UX contract | Deferred pending measured need. |
| Whole-notebook cross-origin iframe | Simple origin boundary | Parent cannot own cell selection, anchors, accessible contextual controls, or review markers without a capability bridge | Rejected; use app-owned cell shell plus isolated rich outputs. |

## 18. Primary technical references

- [Jupyter notebook format and cell IDs](https://nbformat.readthedocs.io/en/latest/)
- [Jupyter notebook security model](https://jupyter-notebook.readthedocs.io/en/5.7.3/security.html)
- [nbconvert](https://nbconvert.readthedocs.io/en/latest/)
- [JupyterLite limitations](https://jupyterlite.readthedocs.io/en/stable/troubleshooting.html)
- [Cloudflare R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [Cloudflare R2 public bucket production guidance](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [Next.js authentication guidance](https://nextjs.org/docs/app/guides/authentication)
- [ORCID authenticated iD integration](https://info.orcid.org/documentation/api-tutorials/api-tutorial-get-and-authenticated-orcid-id/)
