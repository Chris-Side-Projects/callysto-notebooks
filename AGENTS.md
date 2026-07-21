# AGENTS.md — Callysto contributor instructions

These instructions apply to every human or automated contributor working in this repository.

## Current phase

**Milestone 0 is active. M1-M8 are not authorized. M1 is currently NO-GO.**

The repository contains a locally green Next.js scaffold, local feasibility proofs, and an approved product/build specification. It is not a working MVP. The owner approved T000 on 2026-07-20; only T001-T010/Milestone 0 work named in `TODO.md` is currently permitted.

## Required reading order

1. `CONTINUATION.md`
2. `INTENT.md`
3. `DECISIONS.md`
4. `PRODUCT_SPEC.md`
5. `UX_SPEC.md`
6. `ARCHITECTURE.md`
7. `docs/SECURITY.md`
8. `PLAN.md`
9. `TODO.md`
10. `docs/TEST_PLAN.md`
11. `DEVELOPER_NOTES.md`
12. `CODING.md`

Do not infer current scope from the existing UI, old comments, or `docs/agent-tournament.md`. Product and decision documents outrank scaffold code and historical planning artifacts.

## Approval guard

Before changing implementation, confirm all of the following:

- the owner has approved or amended `DECISIONS.md`;
- `TODO.md` names the task as Active or Up Next and its dependencies are complete;
- the proposed change stays inside that task's acceptance criteria;
- new dependencies or external services were approved;
- relevant test and documentation changes are identified before coding.

If any condition is false, stop and ask for the missing decision. Do not “get ahead” by implementing a later milestone.

## Product invariants

- Contextual notebook review is the pilot wedge; comments are not a later social add-on.
- The pilot does not execute notebook code in the browser, converter, orchestrator, or cloud.
- Browser uploads are untrusted incoming bytes; only server-hashed/promoted accepted originals and published source versions are immutable records.
- Comments target an exact version and optional stable cell ID, never an index.
- The application owns inert cell wrappers and review controls; active/rich notebook outputs remain isolated on a cookieless origin or are replaced safely.
- Content delivery uses short signed capabilities and no-store during the pilot so scoped restrictions have a measured revocation bound.
- Owners mark reviewer threads `addressed`; root reviewers resolve/reopen; operators moderation-close but never assert scientific resolution.
- Publisher/operator capabilities are additive and do not confer ownership; public handles/slugs freeze at first publication.
- Rendering is not reproduction, correctness, verification, or peer review.
- Public reading is open; publishing is invite-gated; commenting requires authenticated identity.
- Votes, ranking, forks, live editing, repo sync, private workspaces, DOI, and reproducibility badges are outside the pilot.
- Production never shows fabricated engagement or inert controls.

## Security rules

- Treat notebook files, metadata, comments, OAuth profiles, manifests, and object keys as hostile input.
- Never start a kernel or use `ExecutePreprocessor` in the converter.
- The orchestrator may reach only PostgreSQL/private R2; the converter receives local paths with no secrets or network.
- Never treat a presigned incoming key, `HEAD`, client digest, or ETag as an immutable accepted original; use the approved streaming promotion contract.
- Never render notebook-controlled HTML with application-origin authority.
- Never weaken iframe sandbox/CSP, sanitizer, capability expiry/no-store, lease fence, draft-generation CAS, or recovery-copy policy to make a fixture display.
- Never expose R2 credentials, arbitrary keys, presigned URLs, OAuth tokens, raw email, session data, notebook source, or comment bodies in logs.
- For credentials already stored on the VPS, use the global `use-vps-secrets-safely` skill and
  `docs/VPS_CREDENTIAL_HANDOFF.md`. Paste a Cloudflare token only after the hidden
  `Callysto Cloudflare token:` prompt appears; never paste it into script text or replace the literal
  `$CALLYSTO_CF_TOKEN` variable reference.
- All mutations need server-side authentication/authorization, schema validation, rate limits, and CSRF posture appropriate to the framework.
- Ownership-scoped database queries are required; UI visibility is not authorization.
- Security boundary changes require updates to `ARCHITECTURE.md`, `docs/SECURITY.md`, and hostile-content browser tests.

## Working rules

1. Inspect `git status` and preserve unrelated or pre-existing changes.
2. Reproduce the relevant baseline before editing.
3. Make the smallest coherent change that satisfies one task.
4. Keep domain decisions in server-only functions, not route/UI conditionals.
5. Add named errors and recovery behavior; no silent catch, false success, or indefinite spinner.
6. Update specs/contracts when behavior changes. Do not let code silently supersede accepted documentation.
7. Run the smallest relevant tests while iterating and the full task/milestone gate before handoff.
8. Report evidence honestly as local, staging, production, or not verified.

## Dependency policy

No new package or service without approval. A proposal must include:

- behavior it enables;
- native/existing alternatives considered;
- maintenance and security posture;
- license compatibility;
- production and test footprint;
- lockfile/configuration changes;
- removal or migration path.

Do not resolve vulnerability findings by suppressing the audit or making unreviewed major upgrades.

## Git and commits

Repository commit identity, when the owner authorizes commits:

```text
name:  edwardtheclaw
email: edward.the.claw@gmail.com
```

Commit form:

```text
type(scope): concise behavior change
```

Keep commits atomic and green. Do not mix migrations, auth, rendering, UI redesign, and operational configuration in one commit. Do not commit secrets, real user data, generated local caches, or `.env.local`.

## Definition of done

A task is complete only when:

- its acceptance criteria pass;
- tests cover happy path, boundary, denied access, failure, retry/idempotency, and recovery where relevant;
- production build and relevant static checks pass;
- UX includes loading, empty, error, success, and stale/partial states;
- accessibility is keyboard- and screen-reader-considered;
- security, operations, migrations, and rollback are updated when affected;
- `TODO.md` and the evidence report are current;
- no unrelated file was changed.

“Code written,” “sub-agent reported,” “works with mocks,” and “page loads locally” are not sufficient completion claims.

## Known current baseline

As of 2026-07-21:

- T001 route/configuration repair and the complete local/hosted T002 acceptance gate were merged through PR #1;
- the recorded baseline passed a strict clean install and production audit; four documented
  moderate development-only Drizzle Kit findings remain;
- the current reconciled branch head passes the 2026-07-21 local core gate and audits: strict install,
  formatting, lint, typecheck, 18 unit, 19 integration, 41 Python, 35-document, and production-build
  checks;
- local development/production-server browser baselines and the hardened SHA-pinned Ubuntu 24.04 CI
  workflow pass for baseline commit `558a4cb`;
- PR #2 proof head `48805cc` passed hardened Ubuntu 24.04 hosted CI run `29846200710`; the PR remains
  draft and unmerged;
- the active proof branch adds a passing local two-host nonce-CSP/Ed25519/hostile-output suite in
  Chromium and Firefox, a local-only Cloudflare Worker contract, a minimized converter child
  process, and real local PostgreSQL fencing;
- one bounded converter happy path ran in ephemeral Vercel Sandbox compute and its Sandbox/snapshot
  were cleaned; the outer metadata-denial assertion failed, the credential-bearing orchestrator is
  unselected, and the full hostile/limit/failure/content/R2/recovery matrix remains open, so T004 is
  not complete;
- product migrations/APIs, real auth/storage/rendering, deployed converter/content isolation,
  staging, and production remain absent;
- no live Callysto application is deployed; the only persistent new cloud record is an empty,
  unlinked Vercel proof project, while Cloudflare Worker/R2 and Railway resources are absent;
- dedicated Cloudflare and separate primary/recovery R2 identities, Railway spend/credentials, and
  the external T005/T007/T010 inputs are absent;
- all ephemeral provider-proof resources were cleaned and no proof process should remain running;
- `CONTINUATION.md` is the restart authority for the active Milestone 0 branch and exact next step.

Repair these through approved Milestone 0 tasks. Never hide them by lowering checks.
