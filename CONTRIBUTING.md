# Contributing to Callysto

Callysto is currently in specification review. The project is not accepting unsolicited implementation work until the owner approves the product decisions and Milestone 0 plan.

## Useful contributions now

- Review the product premise and identify a real notebook/reviewer workflow it does or does not fit.
- Challenge a requirement with a concrete user, security, accessibility, scientific-evidence, or operational case.
- Review the direct-upload versus GitHub-exact-commit choice using evidence from the intended pilot cohort.
- Supply a small, redistributable notebook fixture that exercises a documented format/output edge case.
- Identify contradictions across the specification set.

Do not submit real private notebooks, personal data, credentials, provider tokens, copyrighted notebooks you cannot redistribute, or exploit payloads outside a coordinated security report.

## Before proposing a change

Read:

1. `INTENT.md`
2. `DECISIONS.md`
3. `PRODUCT_SPEC.md`
4. `UX_SPEC.md`
5. `ARCHITECTURE.md`
6. `docs/SECURITY.md`
7. `PLAN.md`
8. `AGENTS.md`

Open a focused issue or discussion that states:

- the user/problem or invariant affected;
- current specified behavior;
- proposed change;
- evidence or example;
- tradeoffs and newly introduced failure modes;
- documents/tests that would need to change.

Broad “build GitHub for notebooks” proposals are not actionable without a smaller behavior and validation method.

## Implementation contributions after approval

Only work on an approved Active/Up Next item in `TODO.md`. A pull request should contain:

- one coherent behavior change;
- requirement/task IDs;
- tests for success, denied access, boundary, failure, retry/idempotency, and recovery as applicable;
- documentation/migration/runbook updates;
- exact validation commands and evidence environment;
- dependency/service/license changes;
- screenshots for visible UI states at required widths;
- unresolved risks and rollback notes.

The complete definition of done is in `AGENTS.md`; the verification matrix is in `docs/TEST_PLAN.md`.

## Commit style

```text
type(scope): concise behavior change
```

Examples:

```text
feat(review): anchor threads to immutable cell ids
test(security): reject active svg output in app shell
docs(product): clarify revision trust language
```

Keep generated caches, `.env.local`, credentials, real participant data, and unapproved dependency changes out of commits.

## Conduct, licensing, and security

- The code-of-conduct, repository license, contributor terms, and notebook content-license menu are owner/legal approval gates and must exist before public contribution or publishing opens.
- Treat reviewers, publishers, and operators respectfully; scientific disagreement is not permission for harassment.
- Do not post a suspected security vulnerability publicly. Until a formal security channel is published, contact the repository owner privately and include only the minimum reproduction detail needed.

This temporary guidance will be replaced with approved contribution, conduct, and security-reporting policies before the public pilot.
