# Callysto

**A public review layer for computational claims made in Jupyter notebooks.**

Callysto lets an author publish an immutable notebook source version and lets readers inspect a safe derived view, discuss a specific cell, and create a durable review record around the work.

The initial product is deliberately smaller than “GitHub for notebooks.” It does not execute uploaded code, host primary notebook authoring, or promise that a notebook is reproducible merely because it renders. The first release must prove one loop:

> publish a real notebook → inspect the actual cells and outputs → leave contextual review → respond or publish a revised version

## Status

**Product/specification approved on 2026-07-20. Milestone 0 is active; M1-M8 remain gated. The repository is a green local scaffold plus feasibility proofs, not an MVP.**

The baseline route/tooling repair now builds and passes local core and application-shell browser checks. Publishing, review APIs, authentication, storage, real rendering, provider integrations, staging, and deployment do not exist and must not be inferred from the pages or mockups.

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
9. [`docs/TEST_PLAN.md`](./docs/TEST_PLAN.md) — verification contract.
10. [`TODO.md`](./TODO.md) — the short operational queue.
11. [`DEVELOPER_NOTES.md`](./DEVELOPER_NOTES.md) — current baseline and operating contract.
12. [`docs/PLANNING_REVIEW.md`](./docs/PLANNING_REVIEW.md) — strategic, design, and engineering review record.
13. [`docs/RESEARCH_NOTES.md`](./docs/RESEARCH_NOTES.md) — primary sources, inferences, and open validation questions.
14. [`AGENTS.md`](./AGENTS.md) and [`CODING.md`](./CODING.md) — contributor and implementation rules.
15. [`CONTRIBUTING.md`](./CONTRIBUTING.md) — contribution boundaries.

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

- Domain: [callysto.io](https://callysto.io)
- Repository: `Chris-Side-Projects/callysto-notebooks`
- Platform-code license: awaiting owner/legal approval; Apache-2.0 is the current recommendation, separate from notebook content licenses.
