# Callysto security specification

- Status: **APPROVED SECURITY CONTRACT — M0 PROOFS ACTIVE**
- Scope: invite-only publishing pilot
- Security posture: every upload and rendered output is hostile until constrained by multiple independent controls
- Related: [`PRODUCT_SPEC.md`](../PRODUCT_SPEC.md), [`ARCHITECTURE.md`](../ARCHITECTURE.md), [`DECISIONS.md`](../DECISIONS.md), [`UX_SPEC.md`](../UX_SPEC.md)

This document turns the security requirements in the product and architecture specifications into implementation and launch gates. If this document conflicts with an approved product decision, stop implementation and resolve the conflict in `DECISIONS.md`; do not silently weaken a security boundary.

## 1. Non-negotiable pilot boundary: no notebook execution

Callysto renders the inputs and saved outputs already present in a notebook. It does **not** run code in a browser, web process, worker, container, or third-party compute service.

The pilot must have:

- no `Run`, `Execute`, kernel, terminal, package-install, or arbitrary-command UI or API;
- no `ExecutePreprocessor`, kernel startup, shell invocation, or equivalent path in the renderer;
- no network, cloud metadata access, credentials, or notebook-controlled file path inside the conversion sandbox; the separate orchestrator may reach only allowlisted PostgreSQL and private R2 endpoints;
- a renderer regression fixture whose code would create a marker file and contact a test endpoint if executed; rendering must do neither;
- a build-time check that fails if an execution entry point is introduced into production renderer code; and
- user-facing language that says `render`, never `run`, and never implies that Callysto reproduced or verified an analysis.

Adding execution is a new product and security project. It requires a new threat model, architecture decision, isolation proof, abuse-cost model, and owner approval. It cannot enter the pilot as an implementation convenience.

## 2. Security objectives

In priority order, the system must:

1. Prevent notebook-controlled content from gaining application-origin authority or access to Callysto credentials while still allowing app-owned cell navigation and review controls.
2. Prevent uploaded notebook code from executing.
3. Preserve the integrity and immutability of originals, published versions, comments, and audit history.
4. Prevent one user from reading or mutating another user's non-public resources.
5. Bound resource consumption from uploads, rendering, comments, and automated traffic.
6. Minimize collection and exposure of identity, private draft, report, and operational data.
7. Make containment possible without silently rewriting history: disable, unlist, impose/lift a scoped restriction, revoke a render revision, and restore are explicit audited operations.
8. Fail closed. A failed check must not produce a `ready`, `published`, or trusted state.

## 3. Assets and data classification

| Class | Examples | Public? | Required handling |
|---|---|---:|---|
| Public artifact | Published metadata, structured cell manifest, escaped/sanitized app-owned cell content, isolated rich-output artifacts, public review threads, public profile | yes | Immutable-version URLs, integrity digests, per-content-type handling, safe output headers. |
| Controlled artifact | Incoming objects, accepted/recovery originals, normalized objects, unpublished drafts, failed/revoked renders, restricted objects | no, except authorized public-original delivery | Private R2, opaque keys, least privilege, lifecycle/recovery policy, no bucket listing. |
| Restricted identity | Email, provider subject ID, account links, invitation target, reporter identity | no | Minimum collection, field-level access control, never exposed in public APIs or logs. |
| Secret | Session material, OAuth client secret/token, R2 key, signing/HMAC key, database credential | no | Secret manager/environment injection, environment separation, rotation, redaction. |
| Security record | Audit events, report details, private renderer errors, CSP reports, incident evidence | operator only | Append-oriented access, redaction, retention controls, access audit. |

Notebook contents are not classified as safe merely because the publisher intends to make them public. Drafts remain controlled until publication. Published notebooks may still contain secrets, personal data, malware-like payloads, or unlawful content and remain hostile input to every technical boundary.

## 4. Trust boundaries

```text
UNTRUSTED INTERNET
  browser / bots / uploaded bytes / comment text
          |
          | HTTPS, validation, auth, rate limits
          v
APPLICATION TRUST ZONE
  Next.js web + server-only authorization + PostgreSQL
  app-owned cell shell from validated structured manifest
          |                         |
          | short-lived exact-key  | durable leased job
          | upload authorization   v
          |                  HIGH-RISK WORK ZONE
          v                  JOB ORCHESTRATOR
  PRIVATE OBJECT ZONE        non-root, DB/R2 allowlist,
  R2 incoming/accepted/      fenced leases and promotion
  recovery/derived                 |
                                   | local paths, no secrets
                                   v
                             CONVERTER SANDBOX
                             non-root, bounded,
                             no network/execution
          |
          | immutable per-cell rich-output ID only
          v
UNTRUSTED DISPLAY ZONE
  cookieless content origin -> sandboxed per-cell iframe

EXTERNAL IDENTITY ZONE
  GitHub / ORCID OAuth -> validated callback -> application session

OPERATOR ZONE
  named operator -> audited invitation, retry, scoped restriction, moderation
```

Boundary rules:

- The application origin never returns user-controlled raw HTML, SVG, widget output, or other active notebook MIME. It renders the cell shell from a validated structured manifest, escapes code/plain text, and permits only the approved sanitized Markdown subset.
- The content origin never receives application session cookies, OAuth tokens, database credentials, arbitrary R2 keys, or write access.
- The web service does not read a notebook into process memory during direct upload.
- The orchestrator receives one server-selected upload/job identity, leases with a fence, and has no public listener. It uses bucket-scoped credentials and allowlisted DB/R2 connectivity.
- The converter receives only server-selected local input/output paths. It has no public listener, database/storage/session credential, cloud metadata route, or network namespace.
- Operator access is an authorization role, not a hidden route or UI condition.

## 5. Threat model and control ownership

| ID | Threat | Impact | Prevent | Detect | Contain/recover | Owner |
|---|---|---|---|---|---|---|
| T01 | Stored XSS or active notebook output | Session theft, actions as reader, deceptive UI | App-owned cell shell; escaped code/text; strict sanitized Markdown; rich output isolated per cell on separate origin with no cookies and sandbox without scripts/same-origin/forms/popups/top navigation | Browser security suite, sanitizer corpus, CSP reports | Revoke affected render revision, restrict the version, rotate sessions if boundary crossed | Web + gateway |
| T01A | Sanitizer bypass or MIME confusion | Active content interpreted in the application origin | Parse to typed manifest; server-selected output type; deny sniffing; HTML/SVG/widgets never enter app DOM; default to placeholder | Cross-parser differential fixtures, response-header tests, browser corpus | Disable affected MIME handler, revoke artifacts, rerender with fixed policy | Renderer/web/gateway |
| T02 | Notebook code execution | Host compromise, data theft, abuse cost | Export only; no kernel/execution path; credential-free no-network converter; non-root/read-only/resource limits | Marker-file/canary fixture, process and egress tests | Stop leases, revoke orchestrator credentials, preserve evidence, rebuild image | Renderer |
| T03 | SSRF or remote retrieval during conversion | Internal service or metadata exposure | Converter has no network/metadata route; orchestrator allowlists only DB/R2; no URL fetch in conversion | Controlled DNS/HTTP canary receives zero converter requests | Stop leases, rotate orchestrator credentials, audit jobs | Renderer/infra |
| T04 | Base64/output/resource bomb | Conversion outage, cost amplification | Source, cell, decoded-output, render-size, CPU, memory, disk, and time limits; inspect lengths before decode | Resource metrics and named limit failures | Kill task, terminal failure, restrict repeated abuse | Renderer |
| T05 | Cross-account object access or mutation | Private draft disclosure, artifact corruption | Ownership-scoped queries, server-side role checks, opaque IDs, no bucket listing | Authorization matrix and IDOR tests, audit events | Revoke sessions, restrict affected records, repair pointers from audit | Web/data |
| T06 | Presigned upload misuse/overwrite | Storage abuse or accepted-byte substitution | Unique incoming key, short expiry/quotas; server streams/hash-verifies and promotes local bytes to a different no-overwrite accepted key; draft-generation CAS | Incoming overwrite and promotion tests; lifecycle/anomaly metrics | Revoke credentials if systemic; clean incoming objects; accepted objects stay unchanged | Web/storage/orchestrator |
| T07 | Digest or version substitution | Broken citation and review integrity | Server-computed digest; accepted/recovery copies; immutable versions; fenced render; expected digest compare at publish | Integrity reconciliation, stale-attempt tests, download fixtures | Restrict pointer, retain accepted/recovery original, activate audited safe render revision | Web/orchestrator/data |
| T07A | Stale lease or superseded draft commits | Wrong preview/version content | Lease token/generation fencing plus active upload/draft-generation CAS and immutable artifact identity | Fence-rejection metrics and race tests | Reject promotion, orphan-sweep derived artifacts | Orchestrator/data |
| T07B | Restricted artifact persists in cache | Ongoing platform delivery after moderation | Signed ≤60-second capabilities, no-store user artifacts, no new issuance after restriction | Revocation-latency browser/gateway tests | Disable issuance, rotate signing key only for systemic compromise | Web/gateway |
| T08 | OAuth callback or account-link attack | Account takeover or identity confusion | State, PKCE where supported, exact redirect URIs, secure host-only cookies, explicit second-provider flow, no email-only merge | Callback/link collision security events | Revoke sessions/provider tokens, unlink only through verified recovery | Auth |
| T09 | CSRF or session misuse | Unauthorized mutation | Same-origin mutation policy, CSRF protection, secure `HttpOnly` `SameSite` cookies, origin checks, short-lived sensitive actions | Mutation security tests and anomaly logs | Revoke session and affected action where reversible | Web/auth |
| T10 | Comment spam, harassment, or report abuse | Community harm, operator overload | Authentication, rate limits, small Markdown allowlist, invite-only publishing | Report queue, abuse metrics, repeated-target signals | Tombstone, suspend, impose a scoped restriction, appeal/restoration audit | Trust and safety |
| T11 | Secret or personal-data publication | Harm to publisher or data subjects | Explicit warning, preview and rights/privacy attestation, defense-in-depth pattern warning | Reports and operator review; no claim of complete scanning | Immediately impose restriction/stop new capabilities, contact publisher, follow legal/privacy process | Product/operator |
| T12 | Copyright or license violation | Legal exposure and loss of trust | Required license and rights attestation; public policy | Removal reports and audit trail | Restrict first; documented removal/appeal procedure | Operator/legal |
| T13 | Supply-chain compromise | Broad service compromise | Lockfiles, pinned Python dependencies, review bot, dependency scanning, minimal images, release provenance | CI scans and production anomaly signals | Disable deploy, rotate secrets, rebuild from known source | Engineering |
| T14 | Log or backup leakage | Identity, secret, or notebook disclosure | Redaction, access control, encryption, minimum retention, no raw bodies/tokens/URLs | Redaction tests and access audit | Revoke access, rotate secrets, follow incident process | Infra/data |
| T15 | Operator error or abuse | Improper restriction, suspension, or privilege grant | Additive non-possessory role, offline bootstrap, no self-elevation, MFA operational rule, recent reauth, least privilege, confirmations/reasons/audit | Operator-action review | Revert reversible action; investigate; remove capability/session | Owner/operator |

Residual risk is accepted only in a recorded decision with an owner, expiry/review date, and compensating controls. “The pilot is small” is not a security control.

## 6. Identity, sessions, and authorization

### OAuth and linking

- Use a maintained authentication library rather than custom OAuth protocol code.
- Register exact production and staging callback URLs. Never permit wildcard callbacks.
- Validate OAuth state on every callback and use PKCE when the provider supports it.
- Treat an ORCID iD as authenticated only when received through ORCID OAuth. A profile field is not verified identity.
- Store provider subject identifiers, not assumptions based on display name or email.
- A private notification email is trusted only from a provider's verified-email claim or a Callysto confirmation flow. Participation remains blocked until verified; the address is encrypted for controlled delivery and equality lookup uses HMAC-SHA-256 with a dedicated versioned secret key—never a bare enumerable address hash. It is never public.
- Link a second provider only from an already authenticated session followed by a complete second-provider OAuth flow.
- Never auto-merge accounts based only on matching email. Send collisions to a manual recovery flow.
- Request the minimum provider scopes. Do not retain access or refresh tokens if login can operate without them; if retention is required, encrypt them with a key separate from the database.

### Sessions

- Use `Secure`, `HttpOnly`, host-only cookies with `SameSite=Lax` or stricter. Prefer `__Host-` cookie names in production.
- Rotate session identifiers after sign-in, account linking, privilege change, and recovery.
- Revoke all sessions after suspension, credential compromise, or security-sensitive identity changes.
- Do not put provider tokens, roles, private object keys, or report data in browser-readable session state.
- Authentication answers “who”; every mutation separately evaluates role, object ownership, target state, and action eligibility.
- `publisher` and `operator` are additive capabilities. Operator bootstrap occurs only through an offline, audited administrative procedure; no account can grant itself operator capability. Operator capability does not confer ownership/edit/publish rights. Publisher revocation blocks new draft/publication work and makes unpublished drafts read-only, but does not transfer ownership or remove an active owner's reply/address, export, unlist, or policy-removal rights.

### Authorization

- Centralize authorization in server-only domain functions shared by Route Handlers and server actions.
- Scope object lookup by both identifier and authorized relationship; never fetch then rely on UI hiding.
- Enforce the matrix in `ARCHITECTURE.md` with table-driven tests for logged-out, pending-email, member, publisher, owner-with-publisher-revoked, owner-publisher, suspended user, operator-non-owner, and combined-capability states.
- Operator mutations require a reason, actor ID, correlation ID, and audit event.
- Sensitive operator actions require recent reauthentication; pilot operators must enable MFA on the upstream identity account under the operating policy.
- Publishing, commenting, reporting, retry, and restriction operations remain idempotent where specified. An idempotency record binds actor + operation + target + key to a canonical request hash; replay with a different payload conflicts.

### Request controls

- Mutations accept only the documented methods and `Content-Type`; reject ambiguous or oversized bodies before domain processing.
- Cookie-authenticated mutation endpoints require an approved CSRF defense and an application-origin check. Do not enable credentialed cross-origin API access.
- Apply schema validation at the HTTP boundary and again at critical orchestrator/converter/data boundaries.
- Use generic public authentication errors; put non-secret diagnostic detail behind correlation IDs for operators.

### Application-origin response policy

The application origin has its own tested security headers, separate from the content gateway:

- CSP defaults to `default-src 'self'`; uses nonces/hashes rather than broad inline-script permission; restricts `frame-src` to the exact content origin; restricts `connect-src`, `img-src`, `style-src`, and `font-src` to approved application needs; and sets `object-src 'none'`, `base-uri 'none'`, `form-action 'self'`, and `frame-ancestors 'none'` unless an approved embedding use exists.
- Send HSTS in production after domain/subdomain readiness, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` or stricter, and a restrictive application `Permissions-Policy`.
- Session cookies never scope to the content-origin parent domain in a way that sends them to content frames.
- CI/staging browser tests assert the actual headers and fail on an unreviewed relaxation.

## 7. Upload security

### Authorization flow

1. Authenticate the publisher, verify the invitation-backed role, and verify ownership of the draft.
2. Enforce per-user draft/upload quota before allocating storage.
3. Increment/record the draft generation and generate a unique opaque `incoming/` R2 key. The filename is metadata only and never part of a path.
4. Record expected byte limit, canonical upload content type, advisory browser digest when available, expiry, actor, draft generation, and idempotency key.
5. Issue a short-lived presigned `PUT` for that exact incoming key and operation. Treat the URL as a reusable bearer secret until expiry and never log it.
6. On finalize, `HEAD` only for existence and coarse size/type bounds; set the upload to `verifying` and atomically enqueue one fenced ingest job. `HEAD`, ETag, browser digest, or user metadata alone never makes an accepted original.
7. The orchestrator streams the incoming object once into bounded local storage while computing SHA-256 and size. It compares the advisory digest, then conditionally writes those exact local bytes to a different server-only accepted-original key that the presigned URL cannot address.
8. A fenced transaction marks the upload promoted and enqueues a render job that references only the accepted key, server digest, size, and storage identity. Duplicate finalize/promotion returns the existing logical result; a different payload under one idempotency key conflicts.
9. Draft replacement increments the generation. A superseded ingest/render may finish immutable artifact writes but cannot promote draft state.
10. Incoming, unfinalized, mismatched, expired, superseded, and orphan derived objects are never renderable/public and are removed by bounded lifecycle jobs. Accepted originals are excluded.

Extension and MIME checks provide user feedback, not trust. Only the credential-free converter parses the promoted accepted bytes as a Jupyter notebook.

### Pilot limits

The server, orchestrator, and converter enforce the product limits at their applicable boundaries even if browser checks are bypassed:

- 25 MiB original notebook;
- 2,000 cells;
- 10 MiB for any single decoded output;
- 50 MiB total derived display payload (manifest plus decoded display assets/fragments, excluding the preserved original); and
- bounded JSON depth/string lengths, total decoded outputs, temporary disk, memory, CPU, and wall-clock time chosen and measured in Milestone 1.

Length checks occur before decoding large base64 values. A limit failure is terminal and named; it does not enter a retry loop. Repeated limit abuse increments an abuse signal but does not expose detection detail to the uploader.

### Integrity

- Preserve the promoted accepted original byte-for-byte in private storage; the incoming object is not the original-of-record.
- Compute and persist SHA-256/size while streaming the bytes used for promotion; the browser value is feedback only.
- Use conditional no-overwrite promotion or a proven equivalent. If the platform lacks it, Milestone 0 must choose another safe promotion strategy before implementation.
- Derived identity includes source digest plus renderer, output-policy, normalization, and manifest-schema versions. A successful write is safe to repeat.
- Never overwrite an original or published object. Draft replacement allocates a new upload record and key.
- Publication atomically compares the active draft generation/source/manifest digests and binds immutable version metadata, accepted original, recovery-copy proof, render activation, cells, and audit event.
- Periodically reconcile database pointers, object metadata, and digests. A mismatch fails closed, revokes the active render pointer, and restricts platform delivery pending review.

## 8. Renderer isolation and output policy

### Worker runtime

Rendering has two processes with different trust:

**Job orchestrator**

- runs non-root in a minimal, read-only image and has no public listener;
- may reach only PostgreSQL and private R2 through an enforced allowlist; public internet and cloud metadata are denied;
- holds only the bucket/database credentials needed for leases, incoming verification/promotion, accepted-original reads, and derived writes;
- leases every job with an unguessable token plus monotonically increasing generation;
- renews/completes only by compare-and-set on the same fence; after lease loss it stops and cannot promote state;
- creates fresh bounded local input/output directories and removes them on every exit path; and
- invokes the converter with local paths and an allowlisted configuration, never notebook-controlled arguments.

**Conversion sandbox**

- runs as a separate dedicated non-root child/container with read-only image, fresh bounded writable temp, explicit CPU/memory/process/file-descriptor/disk/wall-time limits;
- has no network namespace, cloud metadata route, listener, database/R2/session/OAuth credential, or inherited orchestrator environment;
- parses with supported `nbformat`, normalizes only the derived copy, and exports with `nbconvert` without kernel startup or execution preprocessors; and
- emits only files and a schema-validated result to the local output directory.

Milestone 0 must prove the deployed isolation, not just mock it. At-least-once delivery is assumed. Terminal state promotion additionally compares draft generation and active upload. Retry never turns a validation failure into success, and no catch-all exception marks a job ready.

### Structured cell manifest and output policy

Do not treat a Jupyter trust signature as permission to execute active content. Before publication, the renderer emits a typed, versioned cell manifest and applies an output policy to every cell and MIME bundle:

- include validated cell ID, ordinal, cell type, source digest, escaped source/plain-text payload, approved sanitized Markdown representation, and zero or more typed output descriptors; do not include arbitrary HTML fragments for the application to inject;
- render the outer notebook and cell shell only from application-owned templates and manifest fields;
- escape code, stream, error, and plain-text output as text; render notebook Markdown only through a strict, versioned Markdown allowlist with raw HTML disabled;
- remove scripts, event-handler attributes, forms, embedded frames, plugin/object/embed elements, `javascript:`/`data:text/html` navigation, refresh redirects, and ambiguous MIME declarations;
- treat rich HTML, SVG, and other active or complex MIME as hostile even after sanitization: put the sanitized artifact in a per-cell isolated frame, or replace it with a labeled placeholder and plain-text representation;
- do not support executable widget state in the pilot; display a labeled unsupported placeholder;
- do not fetch remote images, styles, fonts, scripts, data, or links during conversion;
- preserve code and text as text, with encoding performed by the rendering library rather than string concatenation;
- assign rich-output artifact descriptors using server-generated immutable IDs, declared safe delivery type, byte size, digest, and bounded display dimensions; and
- record renderer version, output-policy version, normalization actions, stripped/unsupported output counts, source digest, manifest digest, and each rich-output digest.

Manifest type is chosen from validated content by server code, never from a browser query parameter or user-controlled response header. `nosniff` is mandatory. Sanitization is defense in depth, not permission to place rich content in the application DOM. If safe handling of a MIME type is uncertain, replace it rather than expanding permissions.

Initial MIME dispatch is deny-by-default:

| Notebook content | Pilot presentation | Security boundary |
|---|---|---|
| Code source, `text/plain`, stream, and error text | Escaped text in app-owned cell component | No HTML interpretation; length bounded. |
| Markdown cell | Strict Markdown AST rendered by app-owned component | Raw HTML disabled; URL scheme and element/attribute allowlists. |
| PNG/JPEG/GIF raster output | Immutable image resource referenced by app-owned cell component | Content gateway declares exact image type and `nosniff`; decoded dimensions/bytes bounded; no SVG fallback. |
| HTML output | Sanitized per-cell artifact or placeholder | Separate-origin sandboxed iframe; never app DOM. |
| SVG output | Sanitized per-cell artifact or placeholder | Separate-origin sandboxed iframe; external references/scripts/events removed; never app DOM or `<img>` on app origin. |
| JavaScript, widget state, iframe, form, plugin/object/embed | Unsupported placeholder plus safe text where available | Not delivered as active content. |
| PDF, audio, video, or unknown MIME | Placeholder/download only until individually approved | Attachment with exact type and `nosniff`; no inline app-origin interpretation. |

A MIME handler is enabled only after hostile fixtures pass in the renderer, gateway, and real browsers. Browser sniffing or a parser disagreement chooses the safer placeholder path.

### App-owned cell shell and per-cell browser isolation

The application reads the structured manifest and renders notebook metadata, cell wrappers, stable anchors, code/plain text, approved Markdown, and review controls from application-owned components. This is what makes cell selection and contextual comments possible without inspecting an untrusted cross-origin DOM.

The application must not parse or query rich-output iframe DOM. Cell ID, output type, dimensions, fallback text, accessibility label, artifact state, and comment anchor come from the validated manifest. The pilot uses no iframe `postMessage` bridge. If an isolated output exceeds its bounded dimensions, scrolling occurs inside its frame or the output is replaced by a download/placeholder state; the application does not grant more origin privileges to auto-size it.

Hostile or complex per-cell output is served through a gateway on a dedicated, cookieless origin. The gateway:

- accepts a signed short-lived capability containing only an opaque render-revision/output ID, audience, and expiry; resolves it through a server-controlled manifest; and never accepts arbitrary R2 keys, paths, MIME values, or filenames;
- has read-only access to the render prefix, no bucket listing, and no access to originals, normalized notebooks, sessions, OAuth, or the database beyond the minimal manifest lookup design;
- returns only expected content types and rejects missing, revoked, restricted, malformed, or path-traversal requests;
- sends a restrictive CSP with `default-src 'none'`, inline styles only, data/blob images/media as approved, no forms or base URL, and `frame-ancestors` restricted to approved Callysto origins;
- sends `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, a restrictive `Permissions-Policy`, and `Cache-Control: private, no-store` for pilot user artifacts; and
- never uses an `r2.dev` public bucket endpoint for production.

Public capabilities expire within 60 seconds. Draft-preview capabilities expire within 5 minutes and bind the exact authorized draft generation and render revision. The application issues/refreshes them on demand per output after rechecking current activation and restriction state; manifests never carry a long-lived bearer URL. The cookieless gateway receives neither session cookie nor database credential. A restriction stops new capability issuance; already issued capabilities bound the maximum new-request revocation delay. The system never claims to recall bytes already downloaded.

The application embeds each rich-output artifact in its own iframe with a `sandbox` attribute that omits `allow-scripts`, `allow-same-origin`, `allow-forms`, `allow-popups`, and every top-navigation permission. The iframe receives no credentialed requests or application tokens. Unsupported HTML, SVG, widget, multimedia, or MIME ambiguity produces a safe placeholder rather than a weaker sandbox.

Local M0 evidence on 2026-07-20 implements this boundary behind a disabled-by-default proof gate:
the application and content gateway bind distinct loopback addresses and the app-host gateway alias
is unreachable; Ed25519 separates issuance from verification; the gateway starts under an exact
public-verifier environment allowlist; the verifier requires canonical exact-field tokens, active
render/draft authority, and the 60/300-second maxima; and 14 optimized-server cases pass across
Chromium and Firefox. This is synthetic local feasibility evidence only. It does not satisfy the
staging launch gates below or prove Cloudflare/R2, a registrable content domain, CDN cache behavior,
key rotation, or provider propagation latency. See [`docs/evidence/M0.5.md`](./evidence/M0.5.md).

Raw notebook downloads pass through an authorized gateway and are returned as `application/octet-stream`, `Content-Disposition: attachment`, and `X-Content-Type-Options: nosniff`. User filenames are safely encoded and never become response-header injection.

## 9. Comments and user-supplied metadata

- Parse the deliberately small Markdown subset into an allowlisted syntax tree. Raw HTML is disabled and stripped.
- Permit only normalized `http` and `https` links; add safe external-link attributes and never permit script/data URLs.
- Enforce title, description, topic, comment, and other product limits in Unicode code points and request bytes.
- Encode all user strings at their output context. Never use notebook title, filename, cell ID, slug, or comment body as raw HTML, SQL, header, log-format, or object-path material.
- Validate slugs and normalized cell IDs against explicit alphabets and lengths. Comments anchor to `version_id` + validated `cell_id`, never index or text similarity.
- A comment author may edit it for 15 minutes; revisions and an `edited` marker remain. Later correction uses a follow-up. Deletion creates a tombstone unless an approved privacy/legal process requires further removal.
- Browser comment drafts persist locally for at most 24 hours per account + version + cell and are cleared on sign-out, as specified in `UX_SPEC.md`.

### Transactional notification controls

- Commit one logical outbox event with the product mutation; never send email inside that transaction.
- Lease notification rows with token/generation fencing, bounded attempts, backoff, and a visible dead-letter state.
- Recheck the current verified address, suspension, and optional review-email preference at dispatch time so a racing opt-out is honored before provider submission.
- Use a provider idempotency key/message ID when supported. A crash after provider acceptance but before local acknowledgment can still duplicate delivery; templates are safe under duplication and the product promises one logical event, not exactly-once email.
- Templates contain only public notebook/version identity and a public deep link. They exclude notebook/comment body, private email lists, reports, object keys, capabilities, tokens, and operator detail.
- Provider webhook/status input is authenticated, schema-validated, minimized, and never permitted to mutate the underlying review event.

## 10. Abuse, moderation, and legal safety

### Pilot controls

- Publishing is invitation-only. An authenticated account without a publisher invitation may read, comment, and report but cannot create/upload/publish.
- Every public notebook and comment has a report path. Reporter identity and free-text details are operator-only.
- Operators have an additive capability that never grants notebook ownership. They can revoke publisher capability, suspend an account, tombstone/moderation-close a comment/thread, unlist where policy permits, and impose a scoped restriction on a notebook, version, render revision, or comment. Each action requires recent reauthentication, reason, and audit; no operator action labels scientific criticism resolved.
- Restriction immediately stops new public capability issuance and discovery, blocks raw download, preserves accepted/recovery originals and history, and produces the defined neutral/tombstone state. Previously issued capabilities expire within the measured ≤60-second SLO; already downloaded bytes cannot be recalled.
- Restoration is explicit and audited. Permanent deletion is a separate policy/legal workflow and is not a one-click moderation control.
- The UI warns publishers not to upload credentials, private data, restricted datasets, or content they cannot license. Publication requires rights, public-visibility, and no-execution-language attestations.
- Secret-pattern and personal-data warnings are defense in depth only. The product must never claim that an automated scan proves an upload safe or compliant.

### Rate-limit baseline

Exact numbers are configuration and must be load-tested before launch. The implementation must independently limit:

| Surface | Primary key | Secondary signal | Failure behavior |
|---|---|---|---|
| OAuth start/callback | transient session + IP | provider/error class | Generic failure or retry; never reveal account existence. |
| Upload authorization/finalize | authenticated actor | IP, draft, storage usage | No key/job; state and metadata preserved. |
| Comment/reply | authenticated actor | IP, notebook/thread | Preserve local draft and return retry time. |
| Report | authenticated actor | IP, target | Return existing receipt for duplicate; prevent report flooding. |
| Public reads/downloads | IP/network class | artifact, egress volume | Throttle without enabling revocation-defeating user-artifact cache; do not expose private state. |
| Operator actions | operator actor | target/action | Conservative limit plus security alert on anomaly. |

Use a privacy-preserving representation for retained IP abuse signals, rotate its HMAC key on a documented schedule, and do not use rate-limit data for product analytics. Operators need a queue view, reason codes, action history, and runbooks before invited users can publish.

### Policies required before launch

Terms, Privacy, Acceptable Use, Copyright/Removal, Content License, Retention, and Moderation policies must be approved and linked before public publishing. The exact allowed notebook license menu and contributor terms remain an owner/legal decision; code must not invent them.

## 11. Secrets and infrastructure access

- Store production secrets only in the deployment platform's secret facility. `.env.example` contains names and non-secret descriptions, never values.
- Use distinct credentials for local, test, staging, and production. Test suites do not call production providers or buckets.
- Use separate least-privilege identities for web upload authorization, orchestrator incoming/accepted/derived access, content-gateway read, recovery-copy write/read, database runtime, database migration, backup, and deployment where the platforms permit it. The converter has no identity.
- R2 credentials are bucket/prefix/operation-scoped. The orchestrator cannot change bucket policy; the gateway cannot write or read originals; the web cannot list content; normal runtime credentials cannot delete recovery copies.
- Database TLS is required outside local development. Runtime SQL roles cannot perform schema administration.
- Keep signing keys, email-lookup HMAC keys, audit/IP HMAC keys, OAuth client secrets, session secret, database credential, and R2 credentials independent so one rotation does not invalidate unrelated evidence.
- Never expose secrets through `NEXT_PUBLIC_*`, rendered HTML, client bundles, error pages, support codes, source maps, logs, metrics labels, or build artifacts.
- Redact OAuth tokens, session cookies, presigned URLs, raw emails, notebook source, comment/report bodies, and private renderer detail at the logging boundary.
- Document owner, creation date, scope, consumers, rotation method, and revocation procedure for every production credential before launch.

Required emergency rotations: session signing material, OAuth clients, database credentials, each R2 service identity, content-gateway signing/lookup credential, deployment token, and audit/IP HMAC keys. Rotation is tested in staging without deleting published artifacts.

## 12. Privacy and retention

### Data minimization

- Collect only identity needed for login/public attribution, publisher invitation state, artifact/review records, reports, audit events, and operational telemetry needed to run the service.
- Do not expose email, provider token, invitation target, reporter identity, private draft, or private failure detail in public pages, APIs, exports, analytics, or search metadata.
- Do not use notebook/comment contents for model training, advertising, or unrelated analytics without a separately approved policy and user consent.
- Product analytics use explicit event definitions and pseudonymous internal IDs, not notebook bodies or comment text.
- Access to controlled/restricted data is limited to named operators with a support, moderation, or incident purpose and is itself auditable.

### Proposed operational retention defaults

These are implementation defaults, not a promise of archival permanence. They require owner/legal approval in the public Retention and Privacy policies before launch.

| Record | Proposed retention | Deletion/expiry behavior |
|---|---|---|
| Presigned upload URL | no more than 10 minutes | Expire automatically; never persist in logs. |
| Incoming upload object | no more than 24 hours after expiry/promotion/failure | Lifecycle deletion; never treated as the accepted original. |
| Orchestrator/converter temporary files | lifetime of one attempt, hard maximum 1 hour | Remove on success, failure, timeout, lease loss, and startup recovery sweep. |
| Superseded or abandoned unpublished draft objects | 30 days after last draft activity | Notify owner where practical, then delete object and retain minimal audit tombstone. |
| Browser comment draft | 24 hours | Clear on expiry and sign-out. |
| Active published/unlisted version, review, accepted original, and verified recovery copy | while the service operates and policy permits | Preserve immutability; unlisting does not delete. Normal runtime credentials cannot delete recovery copy. User/legal deletion follows the approved process and leaves only the minimum lawful integrity/audit record. |
| Superseded/revoked render revision | 90 days minimum or incident/legal policy | Not publicly deliverable; retained long enough for audit, then regenerated artifacts may be deleted because accepted source is recoverable. |
| Restricted content | 90 days minimum unless urgent deletion or legal hold applies | Private, access-restricted review period; then restore or follow approved deletion process. |
| Content reports and moderation case detail | 1 year after closure unless legal hold requires longer | Delete free text/identifiers when no longer needed; retain aggregate reason counts separately. |
| Application logs | 30 days | Automated expiry; security-relevant events are copied in redacted form to audit storage. |
| Security/audit events | 1 year | Append-oriented retention; extend only for active investigation/legal need. |
| Pseudonymous pilot events | pilot duration + 90 days unless approved otherwise | Delete row-level events after decision/interview reconciliation; retain only approved aggregate findings. |
| Database/object backups | 35 days | Encrypted rotation; deletion propagates through backup expiry, documented to requesters. |

Account deletion must revoke sessions immediately, remove non-required identity data, and define what happens to public authorship, published artifacts, and review comments. Because erasing attribution can damage the integrity of a public review record, the public policy and UI must explain whether eligible records are anonymized, tombstoned, or deleted. This is an approval gate, not an engineering assumption.

Backups/recovery copies are encrypted, access-controlled, and restore-tested before launch. Proposed objectives are database PITR RPO ≤15 minutes/RTO ≤8 hours and RPO 0 for published accepted originals because publication requires a separately credentialed SHA-verified recovery copy. Milestone 0 must prove the providers can meet these values or obtain explicit owner acceptance of different values before pilot data exists. Restore tests use staging-isolated credentials, reconstruct version/thread/render relationships, verify sampled digests, regenerate a render, and ensure restricted content does not accidentally become public.

## 13. Logging, monitoring, and audit

Every security-relevant event includes a timestamp, correlation ID, actor ID when known, target ID/type, action/result, public-safe error code, service, and environment. It excludes secrets and raw user content.

Audit at minimum:

- sign-in result, state mismatch, account link/unlink, session revocation, role change, suspension;
- invitation creation/acceptance/revocation;
- upload authorization/finalize/verify/promotion/rejection, incoming overwrite observation, and checksum mismatch;
- ingest/render lease token generation, renewal/loss/fence rejection, retry/failure/success, draft-generation rejection, and full renderer/policy/schema identity;
- publish, unlist, render activation/revocation, restriction/lift, export, and raw download authorization result;
- thread/comment create/edit/tombstone/address/resolve/reopen/moderation-close;
- report create/view/assign/resolve; and
- operator, credential, policy, deployment, and retention-job actions.

Alerts must cover active notebook execution canary, converter egress canary, repeated promotion/checksum/authorization failures, stale fence/generation spikes, render limit/timeout spike, content-gateway CSP/5xx/revocation-SLO breach, notification dead letter, abnormal raw-download volume, operator-action anomaly, backup/recovery-copy age or restore failure, and dependency/secrets-scan failure.

Audit events are append-oriented. Application operators may annotate/correct through a new event, not rewrite prior events. Access to audit and report detail is logged.

## 14. Incident response

### Preconditions before pilot launch

- Name a primary and backup incident commander.
- Configure a private security contact and public vulnerability-reporting route.
- Verify access to deployment disable controls, session revocation, credential rotation, database backups, R2 policy, content gateway, and DNS.
- Exercise one stored-XSS/render-boundary scenario and one credential-compromise scenario in staging.
- Maintain a current service/dependency/credential inventory and contact list.

### Severity

| Severity | Examples | Response target |
|---|---|---|
| SEV-0 critical | Evidence of notebook code execution, application-origin script execution, active credential/session compromise, confirmed restricted-data exfiltration | Page immediately; acknowledge within 15 minutes; contain first, preserve evidence. |
| SEV-1 high | Isolation control absent or bypass suspected, public access to a private/restricted object, integrity mismatch on published version, exploitable auth/IDOR flaw | Acknowledge within 1 hour; disable affected path until disproved or fixed. |
| SEV-2 moderate | Abuse campaign, dependency issue without known exploitation, bounded privacy or availability incident | Same working day; mitigate and schedule verified fix. |
| SEV-3 low | Hardening gap without present exploitability | Track with owner and deadline; fix through normal release process. |

### Response sequence

1. **Declare and assign.** Open a restricted incident record, name commander/scribe, timestamp known facts, and avoid speculation in user-facing messages.
2. **Contain.** Use the smallest reliable kill switch: disable uploads/publishing, stop orchestrator leases, revoke a render revision, impose a restriction, block a route, revoke sessions, or rotate one credential. Never delete evidence to make the alert stop.
3. **Preserve evidence.** Snapshot relevant redacted logs, audit events, digests, versions, deployment IDs, and configuration. Limit access and record chain of custody.
4. **Assess scope.** Identify affected actors, versions, objects, credentials, environments, and first/last known times. Treat unknown scope conservatively.
5. **Eradicate and recover.** Patch the cause, rotate affected credentials, rebuild from known source, restore or regenerate derived artifacts, and run the relevant security gate before reenabling.
6. **Notify.** Follow approved legal/privacy timelines and give affected users precise facts, actions, and uncertainty. Do not call a render issue a data breach without evidence, or conceal one behind generic status copy.
7. **Review.** Produce a blameless post-incident report with root cause, control failures, timeline, user impact, evidence limits, and dated corrective actions. Add a regression test before closure.

Published accepted/recovery originals are not deleted as a rollback tactic. If a derived render is unsafe, revoke/restrict it, retain the originals and old render audit, fix the converter/policy, generate a new render revision, and activate it visibly.

## 15. Security verification gates

### Required fixture set

Maintain versioned notebooks and payloads for:

- code that writes a marker file, spawns a process, imports a kernel client, or contacts a canary if executed;
- HTML/JavaScript event handlers, script tags, forms, iframes, object/embed, refresh redirects, script/data URLs, and sanitizer parser differentials;
- SVG script/event/external-reference payloads, polyglots, mislabeled content, duplicate/ambiguous MIME bundles, and content-sniffing cases;
- remote image/style/font/data URLs that must not be fetched during conversion;
- deep/large JSON, oversized base64, high cell count, long strings, malformed JSON, unsupported nbformat, duplicate/invalid/missing cell IDs;
- path traversal and response-header injection filenames;
- cross-user draft/version/thread IDs, role/state matrix cases, CSRF, replayed idempotency keys, and account-link collision;
- comment Markdown XSS, Unicode edge cases, rapid resubmission, and report duplication; and
- restricted, revoked, missing, stale-manifest, digest-mismatch, lease-fence loss, draft-generation supersession, retry, and partial-promotion/storage states.

### Merge gates

Every merge to `main` must pass:

1. clean install with locked JavaScript and Python dependencies;
2. lint, typecheck, unit, integration, migration, and production build;
3. secrets scan, dependency vulnerability scan, and generated-artifact check;
4. authorization matrix and object-ownership tests for changed mutation paths;
5. converter no-execution/no-network and orchestrator allowlist/fencing/promotion/limit/normalization/idempotency tests for renderer changes;
6. manifest-schema, sanitizer/output-policy, MIME-confusion, per-cell artifact, and content-gateway header/path tests for render changes; and
7. application/content-origin CSP/header tests and an explicit review for changes to auth, storage permissions, CSP/sandbox, renderer, publication transaction, restriction, retention, or audit behavior.

### Staging launch gates

Before any invited publisher can upload:

- real GitHub login and ORCID login or the approved GitHub-only fallback pass without unsafe account merging;
- direct-upload expiry, incoming-key overwrite before/after finalize, server hash/promotion, no-overwrite behavior, promotion crash, quota, and lifecycle cleanup are verified against the staging bucket;
- a real-browser suite proves app-owned cell anchors/comments work without cross-origin DOM access; rich-output scripts do not run; each iframe has an opaque origin; application cookies/storage are unreadable; top navigation/forms/popups are blocked; sanitizer/MIME-confusion fixtures stay outside the app DOM; and arbitrary external requests fail;
- deployed tests prove orchestrator DB/R2-only egress and converter no network/metadata/credentials, no kernel/code execution, non-root/read-only/bounded runtime, fencing, and temp cleanup;
- public/raw/restricted object access, short preview/public capability expiry, no-store behavior, ≤60-second revocation, and content-gateway traversal tests pass;
- application-origin CSP/cookie/security headers and content-origin headers pass in real browsers;
- verified private-email onboarding plus notification fencing, preference race, provider outage, crash-after-provider-acceptance, and dead-letter drills pass;
- database PITR plus separately credentialed accepted-original recovery copy/restore exercise passes without changing visibility or digests and meets approved RPO/RTO;
- retry, poison-job, lost-lease/stale completion, draft replacement, promotion/storage failure, restriction/render-revision restore, session revocation, and credential rotation runbooks are exercised;
- required public policies and security contact are live; and
- no unresolved P0/P1 security finding exists. A lower-severity accepted risk has a named owner and expiry.

### Release evidence

For each production release, retain:

- source commit and reviewed change set;
- dependency lockfile digests and scan results;
- database migration identifier;
- web, renderer, and gateway image/deployment identifiers;
- renderer/output-policy version;
- security test summary and approved exceptions; and
- operator enabling decision and rollback point.

Passing the security gates establishes control behavior for the tested release. It does not establish scientific correctness, reproducibility, or safety of notebook claims.

## 16. Pre-launch security checklist

- [ ] D002 (no execution), D005 (invite publishing), D006/D019 (immutable source + render revisions), D008 (isolated render), D018 (promotion), and D023 (roles/contact) approved.
- [ ] Threat owners and operator/incident roles assigned.
- [ ] Separate production application and content origins provisioned; session cookie cannot reach content origin; app-owned cell shell consumes only the validated manifest.
- [ ] Private R2 buckets/prefixes and least-privilege service identities verified.
- [ ] Upload promotion, fenced orchestrator, credential-free converter, output policy, capability gateway, auth/contact, authorization, notification, abuse, privacy, recovery, and retention controls implemented.
- [ ] Cross-origin browser and hostile-fixture suites green in CI and staging.
- [ ] Database/object recovery completed within approved objectives; restriction/render-revision and credential-rotation exercises completed.
- [ ] Terms, Privacy, Acceptable Use, Copyright/Removal, Content License, Retention, and Moderation policies approved and linked.
- [ ] Security contact, vulnerability route, alerts, and incident runbook live.
- [ ] No mock data, debug endpoint, public source map with secrets, default credential, or production test bypass remains.
