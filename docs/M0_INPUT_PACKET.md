# Milestone 0 owner input packet

- Status: **READY FOR OWNER-SUPPLIED INPUTS**
- Last reconciled: 2026-07-20
- Purpose: collect only the missing evidence needed to resume T005-T010

Do not commit names, email addresses, private repository URLs, notebook bodies, provider secrets, or
legal advice to this repository. Keep the identifiable source list in an owner-controlled private
location and use stable participant/notebook codes in checked-in evidence.

## 1. Cohort and source-path packet (T005)

Required minimum: 6-10 candidate owners/reviewers and at least 8 real candidate notebooks. Record
one row per primary candidate notebook:

| Field | Required entry |
|---|---|
| Participant code | Pseudonymous code, for example `P01` |
| Role in pilot | owner, reviewer, or both |
| Notebook code | Pseudonymous code, for example `N01` |
| Current location | local file, GitHub, another repository, or other |
| GitHub exact commit feasible | yes/no plus reason; do not commit a private URL |
| Upload is a material barrier | yes/no plus the participant's short reason |
| Current review method | email, shared file, pull request, meeting, none, or other |
| Rights/privacy constraints | public-ready, needs redaction, cannot publish, unknown |
| Contextual-review need | the concrete claim/cell/review problem they want solved |
| Assigned reviewer feasible | yes/no/unknown |
| Contact/outreach authorized | yes/no; authority source remains private |

Use the accepted D003 rule without discretion after collection:

```text
choose GitHub exact-commit import only when at least 80% of recruited publishers
both (a) already keep the target notebook in an accessible GitHub repository and
(b) identify snapshot upload as a material barrier;
otherwise choose direct .ipynb upload.
```

Record numerator, denominator, exclusions, and the selected single path. Reconcile
`PRODUCT_SPEC.md`, `UX_SPEC.md`, `ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/TEST_PLAN.md`, `PLAN.md`,
and `TODO.md` before T006 code. Do not build both paths.

## 2. Disposable staging authority (T004/T006/T008)

Provide or explicitly authorize:

- continued in-place read-only use of the verified root-only VPS Cloudflare bundle when inventory
  must be refreshed; do not copy its bearer values into the checkout;
- a Callysto-staging-specific least-privilege Cloudflare API token before any write operation;
- authority to create and later remove clearly named disposable **staging** resources;
- staging primary and separately credentialed recovery R2 locations/identities;
- a deployment platform/plan capable of denying converter network and metadata access and limiting
  orchestrator egress to PostgreSQL/R2;
- staging PostgreSQL/PITR and isolated restore authority; and
- DNS authority for a non-production content hostname, if the Workers hostname is insufficient.

Do not paste secret values into documentation or chat summaries. Place them in the approved local or
provider secret store and report only presence, identity/purpose, and tested permissions. If the
selected Railway plan cannot enforce the boundary, invoke D013 and choose a different sandbox or
platform before provisioning the rest of staging.

## 3. Identity, contact, and delivery packet (T007)

- GitHub OAuth application: client ID/secret in the secret store and exact local/staging callbacks.
- ORCID sandbox application: credentials/callbacks, or an explicit decision to exercise the
  accepted GitHub-only fallback if feasibility fails.
- Verified private-email source and account-linking posture.
- Transactional provider/sender domain plus authority for sandbox delivery and webhook verification.
- Named operator bootstrap owner, recent-reauth rule owner, and MFA operating owner.

Local GitHub CLI authentication is repository access; it is not a product OAuth application and
cannot close this gate.

## 4. License and policy packet (T010)

Name one accountable owner and a pre-launch deadline for each:

- repository software license;
- notebook content-license menu and public display wording;
- contributor terms or contribution agreement posture;
- Terms, Privacy, Acceptable Use, Copyright/Removal, Moderation, and Retention policies;
- security contact and vulnerability-reporting route; and
- participant consent/data handling for the bounded pilot.

Record the owner's decision, not an inferred legal conclusion. Legal review remains the owner's
responsibility where required.

## 5. Resume gate

Work can resume without another discovery pass when the private source location and all applicable
items above have named owners/authority. The next agent should read [`CONTINUATION.md`](../CONTINUATION.md),
verify the active branch and hosted CI state, then execute only the dependency-unblocked M0 task.
