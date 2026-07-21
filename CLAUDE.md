# CLAUDE.md — Callysto project context

**Last reconciled:** 2026-07-20

Follow [`AGENTS.md`](./AGENTS.md) for the complete contributor contract. This file is a concise orientation, not a competing source of truth.

## Project

Callysto is an approved public-review product direction for computational claims made in Jupyter notebooks. The pilot must prove that an invited owner can publish an immutable notebook version, a reviewer can discuss the notebook or exact cell, and the owner can respond/mark addressed while the reviewer resolves/reopens or the owner publishes a linked revision.

It is not currently a working product. The repository contains a locally green Next.js scaffold, local M0 proofs, and an approved specification.

## Status

**Milestone 0 is active. Repair/proof work and approved development dependencies are allowed; M1-M8 product features, production provisioning, and deployment are not.**

T000 was approved on 2026-07-20. T001 and T002 were merged through PR #1; later product milestones remain gated. See [`CONTINUATION.md`](./CONTINUATION.md) before any new work.

## Proposed pilot boundaries

- Next.js web/API, PostgreSQL, private primary/recovery R2, fenced Python orchestrator, credential-free no-network converter, and short-capability isolated content gateway.
- GitHub + ORCID authentication subject to feasibility gate.
- Public reading; authenticated commenting; invite-only publishing.
- An early cohort-source audit selects direct `.ipynb` upload (default) or GitHub exact-commit import using the approved 80% rule; only one is built.
- App-owned cell shell with isolated rich output, immutable versions, stable cell-ID threads.
- Verified private participation email, additive publisher/operator capabilities, and minimal fenced transactional review email.
- No notebook execution, votes, ranking, forks, live editing, repository sync, or private workspaces.

## Read first

```text
CONTINUATION.md
INTENT.md
DECISIONS.md
PRODUCT_SPEC.md
UX_SPEC.md
ARCHITECTURE.md
docs/SECURITY.md
PLAN.md
TODO.md
docs/TEST_PLAN.md
DEVELOPER_NOTES.md
AGENTS.md
CODING.md
```

Do not treat `docs/agent-tournament.md`, current placeholder pages, or old comments as current architecture.

## Current verified state

- Strict clean install, lint, typecheck, unit/integration/exact-Python/vector/docs checks, production audit, and production build pass locally.
- Four documented moderate development-only Drizzle Kit/esbuild findings remain; production audit is clean.
- Playwright app-shell suites pass locally and in the Ubuntu 24.04 hosted workflow against the production server.
- The active branch adds local two-host hostile-output/capability isolation, converter-process, and
  PostgreSQL fencing proofs; its hosted workflow has not run yet.
- No Callysto cloud deployment was found. Staging/providers, migrations, real product APIs, and
  deployed content/converter isolation remain unverified. Read-only Cloudflare inventory is
  available through a root-only VPS credential bundle, but its write scope and suitability for
  Callysto staging are unverified and it supplies no separately credentialed recovery identity.

See [`CONTINUATION.md`](./CONTINUATION.md) and [`DEVELOPER_NOTES.md`](./DEVELOPER_NOTES.md) for the evidence boundary and exact restart sequence.
