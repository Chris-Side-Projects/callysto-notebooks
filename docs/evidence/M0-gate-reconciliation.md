# Milestone 0 gate reconciliation

- Decision: **M1 NO-GO**
- Reconciled: 2026-07-22; dependency remediation local-green, hosted CI pending
- Branch: `agent/m0-isolation-and-deployment-proofs`
- Scope: evidence state after the seven requested M0 workstreams and the approved dependency remediation

## Gate matrix

| M0 item | Current evidence | Gate state |
|---|---|---|
| M0.1 decisions | D001-D024 accepted; M0-only authorization recorded | complete |
| M0.1a cohort/source | Repository evidence exhausted and a private-register/interview/calculation packet exists; no real cohort or notebook records were supplied | blocked on 6–10 real people, at least 8 real notebooks, outreach/consent, reviewers, and the 80% calculation |
| M0.2 scaffold | Canonical route/configuration and build pass | complete |
| M0.3 runtime/dependencies | The accepted baseline remains recorded. Pre-remediation head `caee50b` failed hosted run `29972476045` at production audit after new Next.js/Sharp advisories appeared. The owner-approved Next.js `16.2.11` plus temporary Next-scoped `sharp@0.35.3` working tree passes strict clean install, live audits, one-version dependency-tree assertion, native image-optimizer smoke, and the complete local gate. | local green; hosted CI for eventual committed head pending |
| M0.4 validation | Reconciled proof head `48805cc` passes the local core gate/audits plus hardened Ubuntu 24.04 run `29846200710`, including browser and database proofs. The dependency-remediated working tree now passes the complete local core/browser/PostgreSQL matrix, but historical hosted evidence does not validate its eventual commit. | local green; hosted CI for eventual committed head pending |
| M0.5 content boundary | Local two-host browser proof passes; local Worker contract adds exact capability/index/digest/header/cookie behavior | partial; no deployed Cloudflare/R2/CDN/revocation proof |
| M0.6 converter/orchestrator | Strengthened Vercel nested converter synthetic slice passed and reconciled to zero resources; marker, canary, inherited-FD, deterministic, identity, and isolation assertions passed; outer metadata remained reachable and Docker came from mutable live `dnf` | partial; full converter acceptance matrix and credential-bearing orchestrator platform remain open |
| M0.7 ingestion/promotion | Contract exists | blocked by M0.1a source choice and dedicated staging storage |
| M0.8 identity | Missing-input matrix exists | blocked by staging URL, GitHub OAuth app, ORCID sandbox app/fallback decision, test identities, and administrators |
| M0.9 contact/delivery | Missing-input matrix exists | blocked by verified-email decision, sender/provider/DNS, recipients, dispatcher, and operators |
| M0.10 visual reference | D024-approved responsive mockups | complete |
| M0.11 license/policy | Full owner/approver/deadline matrix exists | blocked on actual decisions and accountable owners; no legal conclusion fabricated |
| M0.12 recovery/operator | Topology/runbook exists; Railway read-only preflight completed | blocked on plan/spend boundary, dedicated credential, PITR/isolated restore, separated R2 identities/lock, operators/MFA, and measured RPO/RTO |

## Seven-workstream disposition

1. **PR and hosted CI:** draft PR #2 is open and unmerged. Reconciled proof head `48805cc` passed
   hosted Ubuntu run `29846200710`. Later pre-remediation head `caee50b` failed run `29972476045`
   only at the production audit after new Next.js/Sharp advisories appeared. The approved
   dependency-remediation working tree now passes the complete local gate; its eventual committed
   head must still pass hosted CI before this current-head row can return to green.
2. **Cloudflare/R2 credentials:** secure intake skill/runbook complete. The shared VPS credential is
   rejected for deployment; the authenticated dashboard is blocked by the current browser security
   policy, so dedicated management, primary, and recovery credentials were not created.
3. **Deployment boundary:** the owner-approved strengthened synthetic converter slice passed in real
   Vercel cloud execution. Vercel Sandbox is rejected for the orchestrator because outer link-local
   metadata remained TCP reachable under deny-all. Railway compute remains rejected because no
   provider-enforced destination allowlist is documented.
4. **Disposable topology:** one empty Vercel proof project exists; the strengthened post-run
   reconciler confirmed project exclusivity and zero Sandboxes/snapshots. Every unintended temporary
   deployment is also gone. Cloudflare/R2 and Railway staging resources were not provisioned
   because their credential/spend gates are unresolved.
5. **Deployed proofs:** the strengthened converter marker/canary/FD/runtime-and-input-identity slice
   and cleanup passed. Its image, fixture, and harness SHA-256 values are retained in
   [`M0-vercel-sandbox-converter.md`](./M0-vercel-sandbox-converter.md). The full hostile/limit/
   failure matrix, content/R2 promotion, DB fencing in a deployed worker, recovery, and browser/CDN
   proofs remain blocked by missing resources and the platform boundary.
6. **External inputs:** the repository was exhaustively converted into non-gameable T005, T007, and
   T010 packets. Real people, provider apps, ownership, and legal/policy decisions cannot be
   fabricated and remain owner inputs.
7. **M0/M1 decision:** the matrix above is explicit. M1 is **NO-GO** until every blocked row has
   environment-labeled evidence and the owner approves the reconciled gate.

## Dependency-remediation evidence

The owner approved a narrow dependency response to hosted run `29972476045`: Next.js `16.2.10` is patched
to exact `16.2.11`, and a temporary exact `sharp@0.35.3` override is scoped under Next because the
stable Next.js package still declares `sharp` as `^0.34.5`. `eslint-config-next` stays at `16.2.10`;
this remediation changes the production runtime dependency, not the lint configuration.

Verified locally for the remediated dependency tree:

- strict clean `npm ci`: 461 packages added and 462 audited;
- live production audit: zero findings;
- live full audit: exactly the four already accepted moderate development-only Drizzle Kit
  findings;
- `npm ls sharp`: only `sharp@0.35.3` resolves;
- `npm run test:next-sharp`: the lock/native Next image-optimizer smoke passed with
  `sharp@0.35.3` and libvips `8.18.3` and is now part of `npm run check` for hosted Linux coverage;
- `npm run check`: formatting, lint, typecheck, 18 unit, 21 integration, 42 Python plus shared
  vectors, the 35-document contract, and the Next.js `16.2.11` production build passed;
- PostgreSQL 17.9 proof: 4/4 passed and stopped with `POSTGRES_STOPPED=yes`;
- production browser suites: Chromium E2E 2/2, Chromium/Firefox security 14/14, and Chromium
  accessibility 4/4 passed;
- shutdown reconciliation: no listeners remained on ports `3100`, `3101`, or `55439`.

Not yet verified at this reconciliation: hosted CI for the eventual committed remediated head. Do
not generalize historical green runs to that future commit. Remove the Sharp override only after a
stable Next.js release declares a patched Sharp range and a clean no-override install resolves
`sharp>=0.35.3` while both live audits, the one-version tree assertion, image-optimizer smoke,
complete local gate, and hosted CI all remain green.

## Deployment status

There is no live Callysto application in local staging, cloud staging, or production. The repository
runs locally and in GitHub Actions. The only persistent new cloud record is the empty Vercel proof
project; it serves no traffic. Ephemeral strengthened Vercel converter compute ran successfully and
was deleted; reconciliation found zero Sandboxes and snapshots. No Cloudflare Worker/R2 bucket,
Railway database, OAuth app, email service, custom DNS, or public Callysto endpoint was created.

The provider result is feasibility-only because the outer bootstrap installed Docker 25.0.14 from
mutable live `dnf`. The converter used Python 3.14.6. Its outer metadata TCP probe remained
reachable, so the result neither selects an orchestrator nor changes the **M1 NO-GO** decision.
