# M0 hosted CI evidence for PR #2

- Status: **HOSTED UBUNTU CI PASSED; PR OPEN AND UNMERGED**
- Verified: 2026-07-21 15:57:22 UTC (2026-07-21 America/New_York)
- Scope: T002-T004 repository gate on an ephemeral GitHub-hosted runner
- Commit: `48805ccefd7fa9fb600ac8c8daa75587ff0a8aca`

Draft [PR #2](https://github.com/Chris-Side-Projects/callysto-notebooks/pull/2), **Prove M0
isolation and converter boundaries**, targets `main` from
`agent/m0-isolation-and-deployment-proofs`. At inspection time the PR was open, draft, unmerged, and
reported a clean merge state.

Pull-request [Actions run
29846200710](https://github.com/Chris-Side-Projects/callysto-notebooks/actions/runs/29846200710)
completed successfully on the exact head commit above. Its single `verify` job passed every configured
step, including:

- pinned Node/npm/Python checks, exact dependency installation, production audit, and the accepted
  full-tree audit gate;
- formatting, lint, typecheck, 18 unit, 19 integration, 41 Python, 35-document, and
  production-build checks through `npm run check`;
- four PostgreSQL lease/generation-fencing cases against the workflow's digest-pinned PostgreSQL 17.9
  service;
- the Chromium product-route baseline;
- the 14-case Chromium/Firefox application-header and hostile-output capability/isolation suite; and
- the Chromium automated serious/critical accessibility smoke baseline.

Immediate predecessor run
[29845855082](https://github.com/Chris-Side-Projects/callysto-notebooks/actions/runs/29845855082)
failed because the launcher selected the development-Mac CA bundle path `/etc/ssl/cert.pem` on
Ubuntu, where that file was absent. Commit
`48805cc` replaced that hardcode with OpenSSL's compiled platform trust locations, added an
executable regression case, and passed the complete rerun above.

## Evidence boundary

This is reproducibility evidence from an ephemeral Ubuntu 24.04 GitHub-hosted runner. It establishes
that the checked-in repository gate and its loopback PostgreSQL/browser proof harnesses pass outside
the development Mac. It is **not** a Callysto application deployment and does not establish:

- a staging or production service, database, migration, domain, or user journey;
- Cloudflare Worker/R2 delivery, a registrable cookieless content hostname, CDN behavior, or
  provider-side revocation timing;
- OS/container-enforced converter no-egress or orchestrator PostgreSQL/R2-only egress;
- real OAuth, email, recovery, object-promotion, participant, or policy evidence; or
- merge approval—the PR remains draft and unmerged until a separate repository decision.

Local proof details and the remaining deployed boundaries are recorded in [`M0.5.md`](./M0.5.md),
[`M0.6.md`](./M0.6.md), and
[`M0-cloud-and-external-gates.md`](./M0-cloud-and-external-gates.md).
