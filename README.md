# Callysto

**A public review layer for computational claims made in Jupyter notebooks.**

Callysto lets an author publish an immutable notebook source version and lets readers inspect a safe derived view, discuss a specific cell, and create a durable review record around the work.

The initial product is deliberately smaller than “GitHub for notebooks.” It does not execute uploaded code, host primary notebook authoring, or promise that a notebook is reproducible merely because it renders. The first release must prove one loop:

> publish a real notebook → inspect the actual cells and outputs → leave contextual review → respond or publish a revised version

## Status

**Product/specification approved on 2026-07-20. Milestone 0 is active; M1-M8 remain gated. The repository is a green scaffold plus bounded feasibility proofs, not an MVP. M1 is currently NO-GO.**

The baseline route/tooling repair and historical PR #2 proof head `48805cc` pass their labeled local
checks and hardened Ubuntu 24.04 [Actions run
29846200710](https://github.com/Chris-Side-Projects/callysto-notebooks/actions/runs/29846200710). The
later pre-remediation head `caee50b` failed [Actions run
29972476045](https://github.com/Chris-Side-Projects/callysto-notebooks/actions/runs/29972476045)
only at the production audit after new Next.js/Sharp advisories appeared. The approved remediation
working tree patches Next.js to `16.2.11` and temporarily pins Next's transitive Sharp to `0.35.3`;
its strict clean install, live audits, dependency-tree assertion, native image-optimizer smoke, and
complete local core/browser/PostgreSQL gate pass. Hosted CI remains pending for the eventual
committed head. `eslint-config-next` stays at `16.2.10`. The Sharp override must remain until a
stable Next.js release declares a patched range and the clean no-override install, live audits,
optimizer smoke, complete local gate, and hosted CI all pass.

The active M0 branch also has local two-host rich-output isolation, a local-only Cloudflare Worker
contract, minimized converter-process and PostgreSQL fencing proofs, and an owner-approved
strengthened converter run in ephemeral Vercel Sandbox compute. Its deterministic hostile fixture,
non-execution/canary, isolation, and resource-limit slice passed; all reported cleanup completed and
an independent reconcile found zero Sandbox/snapshot resources. This remains feasibility-only
because its live `dnf` bootstrap is mutable. It does not complete T004: the outer Sandbox still
allowed link-local metadata TCP access, the credential-bearing orchestrator remains unselected, and
the DB/R2-only orchestrator plus integrated content/R2/recovery gates remain open. Draft PR #2
remains open and unmerged.

No live Callysto application is deployed. The only persistent new cloud record is an empty,
unlinked Vercel proof project; every ephemeral proof Sandbox and snapshot was cleaned. No
Cloudflare Worker/R2 bucket, Railway service/database, integrated staging environment, or production
environment exists. Publishing, review APIs, authentication, storage, provider integrations, and a
production renderer remain absent and must not be inferred from CI, the proof page, the parked
domain, or the mockups.

## Documentation map

Read these in order:

1. [`CONTINUATION.md`](./CONTINUATION.md) — exact current state, evidence, restart commands, and next sequence.
2. [`INTENT.md`](./INTENT.md) — the problem, wedge, principles, and boundaries.
3. [`DECISIONS.md`](./DECISIONS.md) — accepted decisions and their rationale.
4. [`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md) — testable product requirements and launch criteria.
5. [`UX_SPEC.md`](./UX_SPEC.md) — routes, screen hierarchy, interaction states, responsive behavior, and accessibility.
6. [`ARCHITECTURE.md`](./ARCHITECTURE.md) — system boundaries, data model, failures, and deployment.
7. [`docs/SECURITY.md`](./docs/SECURITY.md) — threat model, controls, incident posture, and security gates.
8. [`PLAN.md`](./PLAN.md) — ordered implementation milestones and approval gates.
9. [`TODO.md`](./TODO.md) — the short operational queue.
10. [`docs/TEST_PLAN.md`](./docs/TEST_PLAN.md) — verification contract.
11. [`DEVELOPER_NOTES.md`](./DEVELOPER_NOTES.md) — current baseline and operating contract.
12. [`docs/PLANNING_REVIEW.md`](./docs/PLANNING_REVIEW.md) — strategic, design, and engineering review record.
13. [`docs/RESEARCH_NOTES.md`](./docs/RESEARCH_NOTES.md) — primary sources, inferences, and open validation questions.
14. [`AGENTS.md`](./AGENTS.md) and [`CODING.md`](./CODING.md) — contributor and implementation rules.
15. [`CONTRIBUTING.md`](./CONTRIBUTING.md) — contribution boundaries.
16. [`docs/evidence/M0-gate-reconciliation.md`](./docs/evidence/M0-gate-reconciliation.md) — current seven-workstream gate and explicit M1 NO-GO.
17. [`docs/VPS_CREDENTIAL_HANDOFF.md`](./docs/VPS_CREDENTIAL_HANDOFF.md) — hidden-prompt credential intake without disclosure.

## Proposed pilot

- Public reading.
- Invite-only publishing.
- Authenticated, attributable comments.
- An early cohort-source audit selects one ingestion path: direct `.ipynb` upload is the default; GitHub exact-commit import wins only under the documented 80% rule.
- Static, non-executing app-owned cell view with isolated rich outputs.
- Immutable versions with stable cell anchors.
- Owner `addressed` and reviewer-controlled `resolved/reopened` states.
- No forks, votes, live execution, repository sync, private workspaces, or DOI minting in the pilot.

## Approval rule

The owner approved D001-D024 and authorized T001-T010/Milestone 0 on 2026-07-20. D024 approves the M0 visual reference without opening later product milestones. This does not authorize M1-M8, production deployment, a public launch, or weakening a failed M0 security/provider proof.

## Project

- Domain: [callysto.io](https://callysto.io) — registered and parked; no application is deployed there.
- Repository: `Chris-Side-Projects/callysto-notebooks`
- Platform-code license: awaiting owner/legal approval; Apache-2.0 is the current recommendation, separate from notebook content licenses.
