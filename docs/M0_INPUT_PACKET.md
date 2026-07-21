# Milestone 0 external-input packet

- Status: **OWNER ACTION REQUIRED — REPOSITORY EVIDENCE EXHAUSTED**
- Last reconciled: 2026-07-21
- Scope: T005 cohort/source choice, T007 identity/contact/delivery, and T010 license/policy ownership
- Purpose: collect the external facts and decisions that cannot be derived safely from this repository

Completing this packet supplies inputs; it does not by itself prove a task complete. T005 still
requires real interviews and the recorded source calculation. T007 still requires real staging
provider and delivery exercises. T010 closes when accountable owners, approvers, decisions, and
pre-launch deadlines are recorded; the public-launch gate remains closed until the approved policies
are actually published and linked.

Do not commit cohort names, email addresses, private repository URLs, notebook bodies, provider
secrets, MFA/recovery material, or private legal advice. Keep identifiable cohort and credential
records in owner-controlled private systems. Checked-in evidence uses stable participant/notebook
codes, provider application labels, accountable roles, aggregate results, and non-secret evidence
references. A policy owner may be named publicly only with that person's approval; otherwise record
an accountable role here and keep the named mapping in the private register.

## 1. Repository-backed evidence boundary

The following inventory is already available and must not be requested again as if it were missing:

| Task | Established by the repository | Not established |
|---|---|---|
| T005 | D003 selects exactly one path. Direct `.ipynb` upload is the default; GitHub exact-commit import wins only when at least 80% of confirmed candidate notebooks satisfy both GitHub availability and material-upload-barrier conditions. The pilot requires 6–10 people, at least 8 real notebooks, and a named reviewer per notebook. | No participant register, private source-register location, interview record, outreach authority, real candidate notebook, reviewer assignment, or source-path calculation is present. The three tracked `.ipynb` files are synthetic security/format fixtures and are not cohort evidence. |
| T007 | D004 accepts GitHub plus authenticated ORCID identity, with a documented GitHub-only fallback if ORCID feasibility fails. D016 accepts minimal transactional email. D023 fixes verified private contact and additive, non-possessory publisher/operator capabilities. Blank proposed environment-variable names exist. | Repository/CLI access is not a product OAuth app. No auth library, callback route, provider application, usable provider secret, verified-email mechanism, delivery provider, sender domain, staging operator, or provider proof is present. |
| T010 | D010/D017 require an explicit notebook license, separate software/content licensing, rights attestation, and owner/legal approval. Product/security documents enumerate the required public policies and proposed retention defaults. | The tracked tree has no repository license, package license declaration, code of conduct, approved public policy set, public vulnerability route, content-license menu, contributor-terms decision, policy approver, or deadline. `docs/SECURITY.md` is an engineering security specification, not the public vulnerability policy/contact required for launch. |

The project owner is already the product decision owner under T000. That does not silently make the
project owner the legal approver, privacy owner, security contact, cohort recruiter, provider
administrator, or operating on-call owner.

## 2. T005 — cohort and source-path packet

### 2.1 Private participant register

Create one row per unique person in an owner-controlled private location:

| Field | Required entry |
|---|---|
| Participant code | Stable pseudonymous code such as `P01`; the checked-in evidence uses only this code. |
| Private identity/contact | Name and contact route; never commit this field. |
| Intended role | Notebook owner/publisher, reviewer, or both. |
| Outreach authority | Who authorized contact and when; `not authorized` blocks outreach. |
| Interest/status | Not contacted, invited, interviewed, confirmed, declined, or withdrawn. |
| Availability | Pilot and interview timing, kept privately. |
| Consent/data posture | What research notes, product events, interview notes/recordings, and quotations are permitted. |
| Notebook codes | Every associated candidate notebook code. |
| Reviewer constraints | Independence/conflict, subject expertise, accessibility, or scheduling constraints. |

Minimum evidence is 6–10 unique confirmed people across the owner/reviewer roles. A person may hold
both roles, but the unique-person count must not double-count them.

### 2.2 Private notebook/source register

Create one row per distinct real candidate notebook:

| Field | Required entry |
|---|---|
| Notebook code | Stable pseudonymous code such as `N01`. |
| Owner code | Participant code for the person authorized to offer it. |
| Real claim/work | Paper, report, replication, audit, or data-driven claim it supports; keep private URLs/private titles out of the repository. |
| Current source location | Local file, GitHub, another repository, hosted notebook service, or other. |
| Accessible GitHub exact commit | `yes` only if the owner can supply an accessible repository + path + immutable commit for this notebook; otherwise `no` or `unknown` with reason. |
| Snapshot upload a material barrier | Owner's `yes`/`no`, with a short interview-grounded reason. Convenience alone is not silently upgraded to “material.” |
| Current review method | Email, shared file, pull request, meeting, paper-level comments, none, or other. |
| Contextual-review need | Concrete claim, cell, method, assumption, or saved output reviewers need to discuss. |
| Rights/privacy status | Public-ready, redaction/permission needed, cannot publish, or unknown; name the decision owner privately. |
| Pilot eligibility | Confirmed candidate, possible, duplicate, ineligible, or withdrawn, with dated reason. |
| Approximate bounds | File size, cell count, notable rich outputs, external-data dependency, and format/kernel metadata where known. |
| Proposed reviewer code | A real participant code, plus feasible/confirmed/declined status. |

The minimum calculation set is 8 distinct **confirmed candidate** notebooks tied to real work. Test
fixtures, demonstrations, duplicate exports of one notebook, notebooks with no owner interview, and
notebooks the owner has ruled out are not eligible rows.

### 2.3 Required interview prompts

Ask each notebook owner, without leading them toward either implementation:

1. Where is the exact notebook behind the claim today, and how do you freeze the version someone reviews?
2. How do reviewers currently point to a specific calculation or saved output?
3. Could you supply an `.ipynb` snapshot for publication? What makes that easy or materially difficult?
4. Is the exact target notebook already in GitHub at a commit the pilot may access? If private, could the pilot access it under an approved least-privilege method?
5. What must be removed, licensed, or approved before the notebook can be public?
6. Who is a plausible named reviewer, and what would make that person return to resolve or reopen a thread?
7. Would a stable rendered version plus contextual review improve the current process without notebook execution? Why or why not?

Record observed facts and participant language separately from product-team inference.

### 2.4 Exact 80% calculation

Use notebook rows, not unique people, as the unit:

```text
denominator = every distinct confirmed-candidate notebook in the calculation set

qualifying row =
  accessible GitHub exact commit == yes
  AND snapshot upload a material barrier == yes

ratio = qualifying rows / denominator

if denominator >= 8 and ratio >= 0.80:
  select GitHub exact-commit import
else:
  select direct .ipynb upload
```

`unknown` and unanswered conditions do not qualify. Exclude a row only because it is a duplicate,
withdrawn, ruled ineligible, or no longer a candidate; record the dated reason before calculating.
Do not exclude a `no` merely to raise the ratio. Record denominator, numerator, percentage, row
codes, exclusions, interview dates, evidence owner, and selected path.

Before T006 work, commit only a redacted aggregate decision and reconcile `PRODUCT_SPEC.md`,
`UX_SPEC.md`, `ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/TEST_PLAN.md`, `PLAN.md`, and `TODO.md`.
Do not build or retain a fallback implementation of the unselected path.

### 2.5 T005 completion check

- [ ] Private participant-register location and custodian recorded.
- [ ] 6–10 unique confirmed participants, with outreach authority and consent posture.
- [ ] At least 8 distinct confirmed real notebooks with complete source-workflow answers.
- [ ] At least one feasible named reviewer assignment per notebook.
- [ ] Rights/privacy constraints and decision owners known; no private data copied into Git.
- [ ] Numerator, denominator, exclusions, result, and evidence date independently checked.
- [ ] One source path selected and every affected contract reconciled before T006.

## 3. T007 — identity, verified contact, roles, and delivery packet

### 3.1 Provider application register

Complete one private row for each required environment and provider. Staging and production must
not share credentials; only staging is needed for the M0 proof.

| Field | GitHub staging | ORCID sandbox |
|---|---|---|
| Account/organization owner | Missing | Missing |
| Named application administrator and backup | Missing | Missing |
| Provider application label | Missing | Missing |
| Exact application URL and callback URL | Blocked on staging URL and auth-adapter choice | Blocked on staging URL and auth-adapter choice |
| Minimum requested scopes | Must be documented from the selected adapter/provider proof | Must be documented from the selected adapter/provider proof |
| Client ID available in staging secret store | No evidence | No evidence |
| Client secret available in staging secret store | No evidence | No evidence |
| Access/refresh token retention | Decision missing; retain none unless the login/link flow proves it necessary | Decision missing; retain none unless the login/link flow proves it necessary |
| Terms/production-access constraint | Not assessed for this app | Not assessed; determines whether D004 fallback is needed |
| Approved test identities | Missing; keep private | Missing; keep private |
| Rotation/revocation owner | Missing | Missing |

Do not put a client secret, authorization code, token, private test account, or OAuth recording in
this file, an issue, a pull request, CI output, or a chat summary. Record only the secret-store
binding name, purpose, owner, creation/rotation date, and successful permission test.

The GitHub-only fallback is not automatic. Use it only after the ORCID sandbox/terms/provider spike
records the concrete blocker and the project owner explicitly invokes D004's fallback. A manually
typed ORCID iD is never a substitute.

### 3.2 Verified private-email decision

The owner must approve and the provider spike must prove:

| Decision/input | Required answer |
|---|---|
| Accepted verified source | Which provider-verified claim, Callysto confirmation flow, or ordered combination makes an account participation-ready. |
| Missing/private provider email | Exact user flow when GitHub/ORCID supplies no usable verified email. |
| Confirmation delivery | Provider, expiry, retry/rate-limit behavior, and non-enumerating response. |
| Address change/recovery | Verification and session-revocation behavior; account merging remains prohibited. |
| Storage owner | Owner for encryption and versioned HMAC lookup keys; no bare email hash. |
| Public boundary | Confirmation that raw email is absent from profiles, public APIs/exports, analytics, logs, and notification templates. |
| Data/retention approver | Link to the T010 Privacy/Retention owner and deadline. |

Email equality alone never links or merges accounts. Linking requires an authenticated session plus
the complete second-provider OAuth flow; collision/recovery ownership must be named privately.

### 3.3 Transactional delivery decision

| Field | Required answer |
|---|---|
| Provider and staging account owner | Missing. |
| Sender domain/address and DNS authority | Missing; local `callysto@localhost` is a development placeholder only. |
| Sandbox/test-recipient authority | Missing; do not send to an unconsenting address. |
| Credential/webhook storage owner | Missing; secrets stay in the provider/deployment secret store. |
| Provider idempotency/message identifier | Document supported semantics and the provider-accept/ack ambiguity. |
| Suppression, bounce, complaint, and unsubscribe behavior | Document before real delivery. Security/account mail remains distinct from optional review mail. |
| Data exposure/retention | Confirm templates carry only public notebook/version identity and a public deep link; identify provider retention and legal approver. |
| Dispatcher topology | Select the documented dedicated process or prove an alternative with equivalent fencing, health, shutdown, and scheduling behavior. |
| Rotation/outage owner | Name primary/backup operators and the disable/revoke route. |

### 3.4 Operator and role inputs

Keep the identity/account mapping private, but record accountable roles and proof results:

- primary and backup staging operator;
- offline bootstrap executor and independent verifier;
- upstream identity on which MFA is enforced, plus a recovery owner;
- exact recent-reauth window and the owner who approves changes to it;
- publisher-invitation grant/revoke owner;
- suspension/session-revocation owner; and
- explicit confirmation that operator capability is additive and grants no notebook ownership.

### 3.5 T007 completion check

- [ ] GitHub staging OAuth callback, logout/session expiry, minimal scopes, and secret rotation pass.
- [ ] ORCID sandbox authenticated-iD and linking pass, or a concrete blocker plus explicit D004 fallback is recorded.
- [ ] Both link directions and email-collision cases prove no email-only merge.
- [ ] Missing/unverified email blocks participation; the approved verification path then enables it without exposing the address.
- [ ] Offline operator bootstrap, MFA operating rule, recent reauth, capability composition, publisher revocation, and no self-elevation pass.
- [ ] Real staging delivery covers assignment/deep link, preference race, provider outage, duplicate event, provider-accept/ack ambiguity, bounded retry, webhook validation, and dead letter.
- [ ] Evidence records environment, commit, provider app label, result, date, and non-secret operator role; no secret or private message body is retained.

## 4. T010 — licensing and policy ownership packet

### 4.1 Known current state

- The package is marked `private` and declares no software license.
- No `LICENSE`, `COPYING`, or `CODE_OF_CONDUCT` file is tracked.
- No approved public Terms, Privacy, Acceptable Use, Copyright/Removal, Content License,
  Moderation, Retention, or vulnerability-reporting policy is tracked.
- `CONTRIBUTING.md` is temporary gated guidance; it explicitly leaves licensing, contributor terms,
  conduct, and the public security channel open.
- Proposed retention periods in `docs/SECURITY.md` are engineering defaults pending owner/legal
  approval, not public promises.
- D017 requires the repository software license and publisher-selected notebook license to remain
  separate.

### 4.2 Decision and ownership register

For each row, record: accountable owner, drafter, approver/counsel if needed, decision/status,
public route/file, dependency, deadline **before public publishing**, and evidence of approval.

| Surface | Decision required before T010 can close |
|---|---|
| Service operator | Public operating entity/name, jurisdiction, and contact posture needed by the policy set. |
| Repository software license | Exact SPDX license or a dated decision to keep the repository non-open until changed; confirm compatibility with dependencies and contribution model. |
| Code of conduct | Adopted text, enforcement contact, and incident/escalation owner before public contribution is invited. |
| Contributor terms | DCO, CLA, inbound=outbound, or other explicit posture; who may accept contributions. |
| Notebook license menu | Exact approved SPDX/content choices, no silent default, public display wording, and behavior when no acceptable license applies. |
| Publisher rights attestation | Exact ownership/permission, public-visibility, third-party-content, privacy/secret, and non-execution acknowledgements; withdrawal/removal is handled separately. |
| Terms | Service eligibility, account/publication rules, disclaimers, suspension/removal, and governing-law decisions owned and approved. |
| Privacy | Data categories, purposes, processors, participant research/analytics, provider data, rights/contact, transfers, retention, and incident-notification posture. |
| Acceptable Use | Prohibited content/behavior, automated access, abuse, malware/secret/private-data, and enforcement/appeal posture. |
| Copyright/Removal | Notice, restriction-first handling, counter-notice/appeal, repeat-infringer posture, and statutory-agent requirement if applicable. |
| Moderation | Report triage, reversible restriction, thread moderation close/restore, suspension, appeal, scientific-resolution boundary, and response owner. |
| Retention/account deletion | Approve or amend every proposed retention period; define attribution, public artifact/comment, backup, legal-hold, and deletion/anonymization behavior. |
| Security/vulnerability reporting | Private security contact, public reporting route, safe-handling expectation, primary/backup responder, and disclosure posture. |
| Pilot consent/data handling | Outreach authority, product-event/interview consent, recordings/quotations, withdrawal, participant-code mapping custodian, research retention, and deletion process. |

Selecting a familiar license or policy template is not approval. Record who evaluated fit for this
hosted service, public review record, immutable-version promise, user-supplied notebook content, and
bounded research cohort. Do not let the repository software license imply rights to uploaded
notebooks.

### 4.3 T010 completion check

- [ ] Every register row has one accountable owner and one approver (they may be the same only when explicitly accepted).
- [ ] Repository-license, notebook-license-menu, rights-attestation, and contributor-terms decisions are explicit.
- [ ] Every public policy has an approved scope, route/file, drafter, approver, and pre-launch deadline.
- [ ] Security contact and participant consent/data-handling ownership are assigned.
- [ ] Retention/account-deletion proposals are approved or amended without presenting drafts as policy.
- [ ] Checked-in evidence contains no private legal advice, participant identity, provider secret, or false statement that policies are already live.

## 5. Safe return format and resume gate

The owner can unblock a new session by supplying, without secret values:

```text
PRIVATE_REGISTER_LOCATION=<owner-controlled system and custodian>
T005_COHORT_OWNER=<accountable role/person approved for the record>
T005_COUNTS=<unique people, confirmed notebooks, assigned reviewers>
T005_SOURCE_RESULT=<numerator/denominator, percentage, selected path, evidence date>

T007_PROVIDER_ADMINS=<GitHub, ORCID, email accountable roles>
T007_STAGING_APPS=<non-secret app labels and present/missing status>
T007_EMAIL_DECISION=<verified source and fallback>
T007_DELIVERY_DECISION=<provider, sender-domain status, dispatcher choice>
T007_OPERATOR_DECISION=<bootstrap, MFA, recent-reauth accountable roles>

T010_OWNER_MATRIX=<completed decision/owner/approver/deadline register location>
T010_APPROVED_DECISIONS=<software license, content licenses, contribution posture>
T010_POLICY_DEADLINES=<policy routes and approval deadlines>
```

Never paste credential values into that response. Once the private register exists and applicable
owners/authority are named, the next contributor reads [`CONTINUATION.md`](../CONTINUATION.md),
checks current branch/CI/provider state, and executes only the dependency-unblocked M0 task. T006
cannot start before T005 selects one path. M1 remains closed until every M0 acceptance item has
environment-labeled evidence and the owner explicitly reviews the gate.
