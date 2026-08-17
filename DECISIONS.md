# Callysto decision record

This is an ADR-lite record. The project owner approved D001-D024 in the Codex task on 2026-07-20. That approval authorizes Milestone 0 only; changing an accepted decision or opening M1-M8 requires a new recorded decision.

## D001 — Make contextual review the MVP wedge

- Status: **ACCEPTED — 2026-07-20**
- Decision: The MVP includes notebook-level and cell-level threaded comments. A read-and-publish release without review is not considered an MVP.
- Why: Static notebook rendering already exists elsewhere. Without contextual discussion, Callysto does not test its distinctive value proposition.
- Rejected: Ship rendering first and comments later. That proves hosting, not review.

## D002 — Do not execute uploaded notebooks in the pilot

- Status: **ACCEPTED — 2026-07-20**
- Decision: Render saved notebook inputs and outputs without running code. Do not provide “Run” controls.
- Why: Arbitrary execution multiplies security, dependency, data-access, cost, and reliability scope. It is not required to test whether contextual public review is valuable.
- Later trigger: Consider client-side execution only after the review loop meets the pilot success gates and a compatibility study demonstrates useful coverage.

## D003 — Select one ingestion path from cohort evidence

- Status: **ACCEPTED — 2026-07-20**
- Decision: Milestone 0 audits the recruited cohort's real source workflow before locking ingestion. Use direct `.ipynb` upload unless at least 80% of candidate pilot notebooks already exist in an accessible GitHub repository and owners identify snapshot upload as a material barrier; in that case use exact-repository/path/commit import. Build only one path. OAuth repository sync is deferred.
- Why: Three ingestion modes triple failure states before one real publishing path exists. Direct upload is the broadest default, but the first cohort should decide whether avoiding Git is actually an advantage.
- Rejected: Implement upload, URL import, and repository sync together.

## D004 — Use authenticated identity for participation

- Status: **ACCEPTED — 2026-07-20**
- Decision: Public reading requires no account. Publishing and commenting require authentication. Pilot providers are GitHub and ORCID; provider feasibility and account-linking behavior are validated in Milestone 0.
- Why: GitHub fits notebook-producing technical users. ORCID gives researchers a domain-native identity. Four launch providers add account-linking and support complexity without evidence of need.
- Fallback: If ORCID production credentials or terms block the pilot, launch GitHub first and retain ORCID as a gated milestone rather than substituting unverified manually entered IDs.

## D005 — Invite publishers during the pilot

- Status: **ACCEPTED — 2026-07-20**
- Decision: Anyone may read. Authenticated users may comment. Publishing requires an invitation until moderation, reporting, quotas, and legal policies pass their launch gates.
- Why: A public upload endpoint for active notebook content creates abuse, malware, copyright, privacy, and cost exposure before the project has operational capacity.

## D006 — Preserve immutable versions

- Status: **ACCEPTED — 2026-07-20**
- Decision: Published notebook source bytes and version-bound metadata are immutable and content-addressed with SHA-256. Corrections create a new version. Drafts may be replaced before publication. A derived display may be superseded only by an audited render revision when security or compatibility requires it; the source version never changes and unsafe prior display artifacts are revoked.
- Why: Review and citation are meaningless if the underlying artifact changes in place.

## D007 — Anchor comments to cell IDs, never cell indexes

- Status: **ACCEPTED — 2026-07-20**
- Decision: Cell comments reference the Jupyter cell `id` plus notebook version. For older notebooks with missing IDs, ingestion creates deterministic IDs in Callysto’s normalized copy while preserving the original upload byte-for-byte. Existing invalid or duplicate IDs are rejected rather than silently replaced.
- Why: Cell positions change. Notebook format 4.5 defines unique cell IDs specifically suited to stable anchors.

## D008 — Isolate rendered notebook content

- Status: **ACCEPTED — SECURITY REQUIRED — 2026-07-20**
- Decision: Use an application-owned cell shell for cell identity, navigation, and review. Escape code/plain text and render only a strictly sanitized Markdown subset in that shell. Serve HTML, SVG, widgets, JavaScript, and ambiguous rich outputs from a separate cookieless origin in per-output iframes without `allow-scripts` or `allow-same-origin`, or replace them with a safe placeholder. Raw notebooks download as attachments with `nosniff`.
- Why: Notebook outputs can contain active content, while a whole-notebook cross-origin iframe prevents accessible cell-level review. The split shell/output boundary supports contextual interaction without granting notebook content Callysto credentials or origin privileges.
- Approval note: The exact separate registrable domain is an infrastructure choice, but the isolation boundary is not optional.

## D009 — Use a web app plus an asynchronous render pipeline

- Status: **ACCEPTED — 2026-07-20**
- Decision: Keep Next.js as the web/API application. Add a Python job orchestrator using PostgreSQL as the initial durable queue. The orchestrator may reach only PostgreSQL and private R2; it invokes a credential-free conversion subprocess/container with local paths and no network. Use `nbformat` and `nbconvert` without execution. Do not add Redis for the pilot.
- Why: Rendering belongs off the request path, Python has the native notebook toolchain, and PostgreSQL is already required. This is the smallest architecture with durable retries and visible state.

## D010 — Require explicit publication metadata

- Status: **ACCEPTED — 2026-07-20**
- Decision: Publication requires title, short description, a concrete review question, owner, notebook license, content digest, kernel metadata, and at least one claim/source statement. Paper and dataset URLs remain optional because not every notebook replicates a paper.
- Why: A notebook without provenance or reuse terms is open to view but not meaningfully reusable.
- Open legal gate: The exact allowed license menu and contributor terms require owner/legal approval before public publishing.

## D011 — Separate platform checks from scientific evidence

- Status: **ACCEPTED — 2026-07-20**
- Decision: Pilot status labels are `format valid`, `render complete`, and `render failed`. Do not collect or display an `author-reported execution` badge in the pilot. “Author-reported execution” and “independently reproduced” require a later evidence workflow with an attestation/event record, environment scope, and result.
- Why: Rendering saved outputs is not reproduction and must never be marketed as such.

## D012 — Defer voting, forking, ranking, and private workspaces

- Status: **ACCEPTED — 2026-07-20**
- Decision: These features are not part of the pilot.
- Why: Votes create popularity incentives before quality norms exist. Forks require a diff and lineage model. Private workspaces conflict with public-first validation and add permission complexity.

## D013 — Deploy on the chosen boring stack

- Status: **ACCEPTED — 2026-07-20; COMPUTE PLACEMENT STILL OPEN**
- Decision: Railway hosts web, orchestrator, and PostgreSQL only if Milestone 0 proves the required DB/R2 allowlist and credential-free no-network converter boundary. Cloudflare R2 stores incoming, accepted, recovery, normalized, and derived artifacts under separated credentials. Cloudflare serves the short-capability isolated content origin. GitHub Actions gates merges and deployments.
- Why: These services are plausible for pilot scale, but provider convenience cannot override the converter or recovery boundary. If Railway cannot enforce it, move that boundary rather than adding broad infrastructure.
- Evidence note — reconciled 2026-07-22: Railway compute fails the conditional platform test
  because no provider-enforced destination allowlist is documented. The owner-approved strengthened
  ephemeral Vercel proof passed a credential-free deterministic hostile-fixture,
  non-execution/canary, isolation, and resource-limit converter slice inside nested Docker
  `--network none`; all cleanup reported complete and independent reconciliation found zero
  Sandbox/snapshot resources. Its live `dnf` bootstrap is mutable, so this is feasibility evidence,
  not a certified runtime. Vercel's outer `deny-all` runtime still accepted TCP to link-local
  metadata and is therefore rejected for the credential-bearing orchestrator under the current
  invariant. This applies D013; it does not amend it or accept the proposed two-Sandbox topology.
  Production orchestrator/control-plane placement remains unresolved and M1 remains gated.

## D014 — Treat the current UI as disposable reference material

- Status: **ACCEPTED — 2026-07-20**
- Decision: Reuse useful copy and visual tokens, but remove duplicate routes, mock claims, inert controls, and placeholder product states. Do not preserve the current page structure merely because it exists.
- Why: The scaffold was assembled from competing tournament outputs and currently fails production build. Product truth outranks sunk code.

## D015 — Run an assigned-review cohort, not an empty launch

- Status: **ACCEPTED — 2026-07-20**
- Decision: Recruit 6–10 notebook owners/reviewers, publish at least 8 real notebooks, and assign a named reviewer to each notebook during the pilot.
- Why: Public posting does not create review supply by itself. A bounded cohort tests whether the review loop creates value without confusing distribution failure with product failure.
- Expansion trigger: Open publisher access only after moderation, support load, security, and repeated review behavior meet the pilot gates.

## D016 — Send minimal transactional review notifications

- Status: **ACCEPTED — 2026-07-20**
- Decision: Send version-specific email for assigned reviews, new threads, replies, and resolution/reopen events using a durable outbox. Do not build a follower graph, digest engine, or general notification center in the pilot.
- Why: The core loop depends on an owner returning after feedback. Manual reminders would hide whether the product can close that loop reliably.
- Open implementation choice: Select the transactional provider and sender-domain setup during Milestone 0.

## D017 — Keep software and notebook licensing separate

- Status: **ACCEPTED — 2026-07-20**
- Decision: Choose the repository's open-source license separately from the license each publisher grants for a notebook. Do not imply that the platform software license covers uploaded content.
- Why: Code contribution terms, hosted-service terms, and user-selected artifact reuse rights are different legal surfaces.
- Open legal gate: The owner or counsel must approve the repository license, notebook-license menu, rights attestation, and removal policy before public launch.

## D018 — Promote uploads before trusting them

- Status: **ACCEPTED — SECURITY REQUIRED — 2026-07-20**
- Decision: Browser uploads land only in a unique untrusted `incoming` object. A server-owned verifier streams and hashes the bytes, then writes the verified bytes to a different immutable accepted-original key using no-overwrite semantics. Rendering and publication reference only the promoted object.
- Why: A presigned PUT can remain reusable until expiry, client metadata is not a trust anchor, and `HEAD` alone does not prove the bytes that will later be rendered.

## D019 — Model mutable drafts and replaceable render projections explicitly

- Status: **ACCEPTED — 2026-07-20**
- Decision: Use explicit mutable `notebook_drafts` with an active upload generation. Published `notebook_versions` remain immutable. Derived output lives in versioned `render_revisions`; an audited active-render pointer may change to revoke or regenerate an unsafe display without changing source bytes, metadata, or review history. Moderation restrictions are separate records, not render states.
- Why: An owner must be able to prepare a revision while the current version stays public, and security remediation must not pretend an unsafe derived render never existed.

## D020 — Separate author response from reviewer resolution

- Status: **ACCEPTED — 2026-07-20**
- Decision: A notebook owner may mark a reviewer thread `addressed` and link a response or later version. The root thread author decides whether it is `resolved` or `reopened`. Operators may moderation-close a thread but never label a scientific concern resolved. Any comment author may edit their own comment for 15 minutes; later correction uses a visible follow-up or revision record.
- Why: Letting the notebook owner unilaterally resolve criticism overstates agreement and weakens the evidence value of the review record.

## D021 — Freeze citation handles and slugs

- Status: **ACCEPTED — 2026-07-20**
- Decision: A public owner handle and notebook slug become immutable when the first version is published. Display names remain editable. A later migration may add permanent aliases, but the pilot never breaks an existing version URL.
- Why: Version-specific URLs are citation targets. Mutable path identity would violate the permanence promise even if content rows stayed immutable.

## D022 — Permit one explicitly labeled product demonstration

- Status: **ACCEPTED — 2026-07-20**
- Decision: Before real publications exist, the homepage may show one static, clearly labeled `Product demonstration` that is stored separately from production notebook/review records. It never appears in discovery, counts, analytics, profiles, or search metadata.
- Why: The interaction is difficult to explain without showing a cell and thread, but a demonstration must never masquerade as community activity.

## D023 — Make elevated roles additive and non-possessory

- Status: **ACCEPTED — SECURITY REQUIRED — 2026-07-20**
- Decision: `member` is the base account state. `publisher` and `operator` are additive capabilities, not a hierarchy. Operator capability does not confer ownership or permission to edit/publish another person's notebook. Revoking publisher capability prevents new draft/publication work but does not transfer ownership, mutate existing publications, or remove the owner's export/unlist/removal rights; unpublished drafts become read-only until regrant or policy disposition. Participation requires a private verified notification address; public profiles never expose it.
- Why: Support authority and content ownership are different powers, and the review loop cannot reliably return participants without a verified private contact channel.

## D024 — Approve the M0 visual reference

- Status: **ACCEPTED — 2026-07-20**
- Decision: Approve the four responsive artifacts in `docs/design/m0` without amendment as the visual reference for the later application UI milestone, including the editorial visual system, honest homepage demonstration, desktop contextual rail, mobile inline discussion, provenance density, review-state language, and processing/failure hierarchy.
- Why: The set keeps the notebook and review record primary, makes unavailable behavior explicit, and represents the approved contextual-review wedge at desktop and mobile widths without fabricating product activity.
- Boundary: This closes M0.10/T009 design approval only. It does not authorize M1-M8, make the static controls functional, or replace implementation-stage accessibility, hostile-content, and visual QA evidence.
