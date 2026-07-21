# Milestone 0 gate reconciliation

- Decision: **M1 NO-GO**
- Reconciled: 2026-07-21
- Branch: `agent/m0-isolation-and-deployment-proofs`
- Scope: evidence state after the seven requested M0 workstreams

## Gate matrix

| M0 item | Current evidence | Gate state |
|---|---|---|
| M0.1 decisions | D001-D024 accepted; M0-only authorization recorded | complete |
| M0.1a cohort/source | Repository evidence exhausted and a private-register/interview/calculation packet exists; no real cohort or notebook records were supplied | blocked on 6–10 real people, at least 8 real notebooks, outreach/consent, reviewers, and the 80% calculation |
| M0.2 scaffold | Canonical route/configuration and build pass | complete |
| M0.3 runtime/dependencies | Exact runtimes, lockfile, install policy, audits, and dependency register pass | complete |
| M0.4 validation | Current final-head local core gate and audits pass; browser/database proofs and hosted Ubuntu CI pass on the prior PR head; final-head hosted CI must pass after push | complete after final hosted rerun |
| M0.5 content boundary | Local two-host browser proof passes; local Worker contract adds exact capability/index/digest/header/cookie behavior | partial; no deployed Cloudflare/R2/CDN/revocation proof |
| M0.6 converter/orchestrator | Prior Vercel nested converter happy path passed and reconciled; outer metadata remained reachable; strengthened harness is locally tested but not replayed | partial; full converter acceptance matrix and credential-bearing orchestrator platform remain open |
| M0.7 ingestion/promotion | Contract exists | blocked by M0.1a source choice and dedicated staging storage |
| M0.8 identity | Missing-input matrix exists | blocked by staging URL, GitHub OAuth app, ORCID sandbox app/fallback decision, test identities, and administrators |
| M0.9 contact/delivery | Missing-input matrix exists | blocked by verified-email decision, sender/provider/DNS, recipients, dispatcher, and operators |
| M0.10 visual reference | D024-approved responsive mockups | complete |
| M0.11 license/policy | Full owner/approver/deadline matrix exists | blocked on actual decisions and accountable owners; no legal conclusion fabricated |
| M0.12 recovery/operator | Topology/runbook exists; Railway read-only preflight completed | blocked on plan/spend boundary, dedicated credential, PITR/isolated restore, separated R2 identities/lock, operators/MFA, and measured RPO/RTO |

## Seven-workstream disposition

1. **PR and hosted CI:** draft PR #2 is open; prior head `1384dde` passed hosted Ubuntu run
   29797337843. The final reconciliation head must be pushed and rerun before this branch is called
   green.
2. **Cloudflare/R2 credentials:** secure intake skill/runbook complete. The shared VPS credential is
   rejected for deployment; the authenticated dashboard is blocked by the current browser security
   policy, so dedicated management, primary, and recovery credentials were not created.
3. **Deployment boundary:** one converter happy path passed in real Vercel cloud execution. Vercel Sandbox is
   rejected for the orchestrator because outer link-local metadata remained TCP reachable under
   deny-all. Railway compute remains rejected because no provider-enforced destination allowlist is
   documented.
4. **Disposable topology:** one empty Vercel proof project exists; every Sandbox/snapshot and every
   unintended temporary deployment is gone. Cloudflare/R2 and Railway staging resources were not
   provisioned because their credential/spend gates are unresolved.
5. **Deployed proofs:** the prior converter happy path and cleanup passed. The strengthened
   canary/marker/FD/runtime-identity replay requires explicit external-upload approval and has not
   run. Content/R2 promotion, DB fencing in a deployed worker, recovery, and browser/CDN proofs
   remain blocked by missing resources and the platform boundary.
6. **External inputs:** the repository was exhaustively converted into non-gameable T005, T007, and
   T010 packets. Real people, provider apps, ownership, and legal/policy decisions cannot be
   fabricated and remain owner inputs.
7. **M0/M1 decision:** the matrix above is explicit. M1 is **NO-GO** until every blocked row has
   environment-labeled evidence and the owner approves the reconciled gate.

## Deployment status

There is no live Callysto application in local staging, cloud staging, or production. The repository
runs locally and in GitHub Actions. The only persistent new cloud record is the empty Vercel proof
project; it serves no traffic. Ephemeral Vercel converter compute ran successfully and was deleted.
No Cloudflare Worker/R2 bucket, Railway database, OAuth app, email service, custom DNS, or public
Callysto endpoint was created.
