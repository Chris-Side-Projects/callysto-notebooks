# M0 cloud inventory and external-input gates

- Status: **NO CALLYSTO DEPLOYMENT FOUND; CLOUDFLARE READ ACCESS VERIFIED; STAGING INPUTS REQUIRED**
- Audited: 2026-07-20
- Scope: read-only provider inventory plus T005-T010 dependency reconciliation

## Deployment inventory

Callysto is locally executable and has hosted verification in GitHub Actions, but it is not deployed
to a verified staging or production application environment.

| Surface | Access verified | Callysto resource found | Evidence boundary |
|---|---:|---:|---|
| GitHub repository and Actions | yes | repository and CI only | Public repository, one CI workflow, zero environments, zero deployments, zero Actions secrets/variables, and no GitHub Pages site. The latest audited `main` check was the passing `verify` workflow for merge commit `a7b0d859`. |
| Railway | yes | no | The local account is authenticated and all nine accessible projects were inspected. This checkout is not linked and no project references Callysto. No service or database was created. |
| Vercel | yes | no | The stored account and both available team scopes were inspected across 15 projects. No project, alias, domain, or repository link references Callysto. No project was created. |
| Cloudflare Workers/R2 | partial | no | A root-only VPS bundle has an active API token. In-place read-only R2, Workers, and zone inventory succeeded and found no Callysto-named resource. Write scope is untested, and its single existing R2 identity does not satisfy primary/recovery separation. |
| Domain/DNS | public DNS only | parked domain | `callysto.io` resolves to GoDaddy parking infrastructure. `staging.callysto.io` has no A or CNAME record. DNS authority was not demonstrated or changed. |

Git HTTPS remote access is sufficient to publish repository branches. The stored GitHub CLI token
reported invalid during the final publication check, so current `gh` API access is not claimed and
the earlier read-only inventory remains dated evidence. Neither access path proves the OAuth
application, R2, email, database, DNS, or deployment credentials required by the product. The token
used for the earlier inventory lacked `read:packages`, so organization package inventory is not
claimed.

The Cloudflare bearer and R2 values remained on the VPS and were neither printed nor copied into the
checkout. The active Cloudflared tunnel token is a separate connector credential and was not reused.
The shared API token is suitable for current read-only discovery only; it is not accepted as a
Callysto deployment credential without a policy-scope review.

## Why no cloud resource was created

Milestone 0 authorizes deployed feasibility evidence, but not production provisioning or a weaker
substitute for an isolation proof. The proposed topology requires:

- an orchestrator whose egress is enforceably limited to PostgreSQL and private R2;
- a credential-free converter with no network or metadata route;
- private primary and separately credentialed recovery object locations; and
- a content gateway on a distinct deployed hostname with exact capability, cache, cookie, and
  revocation behavior.

The currently accessible Railway documentation and account inventory do not establish those
process/network controls. Cloudflare read inventory is available, but the shared credential's write
scope was intentionally not exercised and the required Callysto-specific primary/recovery identities
do not exist. Creating an ordinary Railway or Vercel web service would therefore consume cloud
resources without closing the M0 gate. If the chosen Railway plan cannot enforce the boundary in a
staging probe, D013 requires a platform or isolation-design review rather than relaxing the
requirement.

## External-input gate by active task

| Task | Work completed now | Required next input or authority |
|---|---|---|
| T005 cohort/source selection | The interview fields and 80% decision rule remain canonical. No participant data was fabricated and no outreach occurred. | Owner supplies 6-10 candidate participants, at least 8 candidate notebooks, contact permission, and any privacy/rights constraints. |
| T006 trusted-original proof | Dependency and acceptance contract remain documented; implementation has not started because selecting both ingestion paths would violate scope. | T005 selects direct upload or GitHub exact-commit; staging R2 credentials and bucket authority are then required. |
| T007 identity/contact/delivery | Local GitHub CLI access was distinguished from product OAuth credentials. No repository Actions secrets exist. | GitHub OAuth app, ORCID sandbox app or explicit fallback, verified-email source, sender/provider account, and provider-specific callback/domain authority. |
| T008 recovery/operator topology | Proposed RPO/RTO and separate-credential rules remain documented. | Staging PostgreSQL backup/PITR capability, primary and recovery R2 identities/locations, restore authority, and named operator/MFA owner. |
| T009 mockups | Complete and owner approved under D024. | None for M0. |
| T010 licensing/policy ownership | Open decisions are enumerated; no legal conclusion was invented. | Repository license, notebook-license menu, contributor terms posture, and named owners/deadlines for privacy, terms, AUP, copyright/removal, moderation, and retention. |

## Safe next cloud step

After Callysto-specific Cloudflare/R2 credentials and an enforceable converter isolation option are
available, create an explicitly disposable **staging** topology only. Run the egress,
secret-absence, R2 promotion, content-host, revocation, and recovery probes before any M1
authorization. Until then, evidence is `verified locally` or `not verified`; it is neither staging
nor production evidence.

The exact safe-to-share fields and secret-handling boundary are prepared in
[`docs/M0_INPUT_PACKET.md`](../M0_INPUT_PACKET.md).
