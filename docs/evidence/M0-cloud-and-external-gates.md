# M0 cloud inventory and external-input gates

- Status: **NO LIVE DEPLOYMENT; DISPOSABLE CONVERTER PROOF RAN; CLOUD/EXTERNAL GATES REMAIN**
- Last reconciled: 2026-07-21
- Scope: read-only provider inventory plus T005-T010 dependency reconciliation

## Deployment inventory

Callysto is locally executable and has hosted verification in GitHub Actions, but it is not deployed
to a verified staging or production application environment.

| Surface | Access verified | Callysto resource found | Evidence boundary |
|---|---:|---:|---|
| GitHub repository and Actions | yes | repository and CI only | Public repository, one CI workflow, zero environments, zero deployments, zero Actions secrets/variables, and no GitHub Pages site. The latest audited `main` check was the passing `verify` workflow for merge commit `a7b0d859`. |
| Railway | yes | no | The account preflight found nine existing projects, no Callysto project, no repository link, and no configured workspace compute limit. The credential is a broad interactive user identity, not a dedicated project token. No service/database was created because plan tier, shared-workspace spend impact, dedicated credential, and dashboard-driven PITR authority remain unresolved. |
| Vercel | yes | proof project only | One empty, unlinked `callysto-m0-proof` control project now exists in the selected team. A prior converter happy-path slice ran; its Sandboxes/snapshots were deleted and reconciliation found zero proof resources. The strengthened replay was not externally authorized. No live app, alias, domain, or Git connection exists. |
| Cloudflare Workers/R2 | historical read only | no | Earlier in-place inventory through a shared VPS bundle found no Callysto resource. The bundle is now rejected for deployment: it is shared, its parent boundary does not satisfy the new credential skill, its token cannot create/list the required scoped credentials (provider code `9109`), and one R2 identity cannot establish primary/recovery separation. |
| Domain/DNS | public DNS only | parked domain | `callysto.io` resolves to GoDaddy parking infrastructure. `staging.callysto.io` has no A or CNAME record. DNS authority was not demonstrated or changed. |

Git HTTPS remote access is sufficient to publish repository branches. The stored GitHub CLI token
reported invalid during the final publication check, so current `gh` API access is not claimed and
the earlier read-only inventory remains dated evidence. Neither access path proves the OAuth
application, R2, email, database, DNS, or deployment credentials required by the product. The token
used for the earlier inventory lacked `read:packages`, so organization package inventory is not
claimed.

The Cloudflare bearer and R2 values remained on the VPS and were neither printed nor copied into the
checkout. The active Cloudflared tunnel token is a separate connector credential and was not reused.
The shared bundle is dated inventory evidence only and must not be used for Callysto deployment. The
dedicated management token and separate primary/recovery R2 credentials remain absent. The
authenticated Cloudflare dashboard is also blocked by the current browser security policy, so this
session did not attempt a bypass.

## Why no integrated staging resource was created

Milestone 0 authorizes deployed feasibility evidence, but not production provisioning or a weaker
substitute for an isolation proof. The proposed topology requires:

- an orchestrator whose egress is enforceably limited to PostgreSQL and private R2;
- a credential-free converter with no network or metadata route;
- private primary and separately credentialed recovery object locations; and
- a content gateway on a distinct deployed hostname with exact capability, cache, cookie, and
  revocation behavior.

The real Vercel converter experiment established one nested no-network happy-path slice but also showed that the
outer Sandbox could connect to link-local metadata under provider `deny-all`. It is therefore not
accepted for the credential-bearing orchestrator. Railway documentation still does not establish a
destination allowlist for compute, and the account preflight cannot safely start billable PITR work
without a plan/spend boundary and dedicated credential. Cloudflare's required credential set is
absent. Creating an ordinary web service would consume resources without closing the gate.

## External-input gate by active task

| Task | Work completed now | Required next input or authority |
|---|---|---|
| T005 cohort/source selection | The interview fields and 80% decision rule remain canonical. No participant data was fabricated and no outreach occurred. | Owner supplies 6-10 candidate participants, at least 8 candidate notebooks, contact permission, and any privacy/rights constraints. |
| T006 trusted-original proof | Dependency and acceptance contract remain documented; implementation has not started because selecting both ingestion paths would violate scope. | T005 selects direct upload or GitHub exact-commit; staging R2 credentials and bucket authority are then required. |
| T007 identity/contact/delivery | Local GitHub CLI access was distinguished from product OAuth credentials. No repository Actions secrets exist. | GitHub OAuth app, ORCID sandbox app or explicit fallback, verified-email source, sender/provider account, and provider-specific callback/domain authority. |
| T008 recovery/operator topology | Proposed RPO/RTO and separate-credential rules remain documented; Railway pricing/cost-control/PITR preflight is complete. | Explicit plan/spend boundary, a dedicated Railway credential, staging PITR/isolated-restore authority, primary and recovery R2 identities/locations, restore authority, and named operator/MFA owner. |
| T009 mockups | Complete and owner approved under D024. | None for M0. |
| T010 licensing/policy ownership | Open decisions are enumerated; no legal conclusion was invented. | Repository license, notebook-license menu, contributor terms posture, and named owners/deadlines for privacy, terms, AUP, copyright/removal, moderation, and retention. |

## Safe next cloud step

After Callysto-specific Cloudflare/R2 credentials, an explicit Railway proof spend boundary, and a
metadata-safe DB/R2-only orchestrator platform are available, create an explicitly disposable
staging topology. The prior converter result is labeled `verified in disposable provider proof`
only for its recorded assertions; the strengthened replay and all other cloud gates remain local or
not verified. Run promotion, content-host, revocation,
orchestrator, and recovery probes before any M1 authorization.

The exact safe-to-share fields and secret-handling boundary are prepared in
[`docs/M0_INPUT_PACKET.md`](../M0_INPUT_PACKET.md).

The secure hidden-prompt handoff and exact token paste point are in
[`docs/VPS_CREDENTIAL_HANDOFF.md`](../VPS_CREDENTIAL_HANDOFF.md).
