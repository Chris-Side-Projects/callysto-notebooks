# Callysto planning review

- Status: **APPROVED FOR MILESTONE 0 — 2026-07-20**
- Review date: 2026-07-19
- Implementation authorized: **T001-T010 / Milestone 0 only**
- Review inputs: existing scaffold/docs, primary-source research, product/CEO pass, independent design pass, independent engineering pass

> Historical baseline note: the build/typecheck/tooling defects below describe the 2026-07-19
> review input. T001 and the local core T002 gate were repaired on 2026-07-20. See
> [`CONTINUATION.md`](../CONTINUATION.md) for current state and evidence.

## 1. Executive conclusion

The repository should not be built from its old roadmap. The earlier concept bundled notebook hosting, three ingestion modes, social ranking, profiles, forking, browser execution, cloud execution, and a broad research commons before establishing why users would switch from existing tools.

The improved product thesis is narrower:

> Callysto is a public review layer for computational claims made in Jupyter notebooks.

The pilot should prove one closed loop: publish an immutable version → inspect an exact cell/output → leave a contextual review → receive an owner response/address or linked revision → let the root reviewer resolve or reopen.

At review time, the code did not implement that loop and did not build. The approved response was to
repair the scaffold through Milestone 0, approve the responsive screen set, and then implement the
vertical slice only through the gated sequence in `PLAN.md`.

## 2. What was found

### Existing repository at review time

- A small Next.js scaffold exists, but production build fails because two dynamic route trees describe the same URL pattern.
- Typecheck fails because `drizzle.config.ts` imports missing `drizzle-kit`.
- There is no lint task, automated test suite, migration history, renderer, API surface, CI workflow, or verified deployment.
- Existing pages merge incompatible design concepts and show votes, forks, run controls, mock content, and visual motifs that do not match the proposed pilot.
- Legacy documents disagree about whether the stack is decided, whether comments belong in the MVP, which identity providers are required, and whether execution is a client, server, or future concern.
- `docs/agent-tournament.md` is historical process evidence, not product or system architecture.

### Product landscape

The primary-source review in [`RESEARCH_NOTES.md`](./RESEARCH_NOTES.md) shows that static notebook display, Git-based notebook review, repository-to-runtime environments, compute capsules, and modular research publishing already exist in adjacent products. This makes “host notebooks online” too weak a wedge. It does not prove demand for Callysto, but it clarifies what the pilot must test.

## 3. Premise challenge

### Original premise

“GitHub + arXiv + Wikipedia for notebooks”: open publication, public comment, collaborative improvement, execution, and a broader knowledge infrastructure platform.

### Problems with that premise

1. It combines distinct products with different trust, moderation, data, and infrastructure requirements.
2. Static notebook publishing is already available and does not test review value.
3. “Reproducibility” is not supported by displaying an `.ipynb` file and saved outputs.
4. Social features do not create qualified reviewer supply.
5. Execution would dominate engineering and security before the review workflow is validated.
6. A public launch without assigned reviewers could fail from distribution rather than product value.

### Revised premise

Use immutable notebook versions and stable cell anchors to make computational review legible, contextual, public, and durable. Recruit both sides of the review loop deliberately. Treat format/render checks, author claims, discussion, and future independent execution as separate evidence.

## 4. Approaches considered

### A — Hosted direct-upload review layer — recommended

An invited owner uploads the exact `.ipynb`; Callysto preserves it, creates a safe static representation, publishes an immutable version, and hosts contextual review.

Benefits:

- works for users who do not keep notebooks in public Git repositories;
- gives Callysto an exact immutable byte artifact and consistent publication flow;
- directly tests the hosted public review record;
- avoids URL fetching, repository permissions, API limits, webhooks, sync conflict, and SSRF in the first build.

Costs:

- Callysto owns storage and version submission immediately;
- Git-native publishers must upload a snapshot rather than link their existing source workflow;
- without a clear source link/commit field, provenance could be weaker, so source metadata remains prominent.

### B — GitHub exact-commit review layer — viable owner taste alternative

An owner provides a repository, path, and exact commit SHA; Callysto imports and reviews that immutable source.

Benefits:

- reuses GitHub identity, storage, versioning, and existing publisher habits;
- may reach a pilot faster if every target participant is already Git-native;
- gives source lineage naturally.

Costs:

- overlaps more directly with ReviewNB;
- excludes or burdens non-Git researchers;
- adds remote fetch, API/rate-limit, repository visibility, token-scope, large-file, and source-change cases;
- repository sync must still be deferred to avoid mutable review targets.

Decision rule: if at least 80% of the recruited first cohort already has the target notebook in an accessible GitHub repository and considers upload a material barrier, choose exact-commit import. Otherwise choose direct upload. Do not ship both in the pilot.

### C — Reproducible compute capsule

Collect code, data, environment, and execution resources and offer reruns.

This is the 10-star long-term evidence product, but it is the wrong pilot: it requires environment capture, data rights/hosting, sandboxed compute, cost controls, compatibility, and a far stronger scientific-evidence model. Callysto can later integrate with Binder, Code Ocean, Whole Tale, or standards rather than reimplement every layer.

## 5. Dream-state experience

The long-term best experience would let a reader:

1. identify the claim, artifact version, source, environment, data, and rights;
2. navigate stable cells and outputs with review context;
3. distinguish automated format/render checks, author attestations, public discussion, and independently recorded reruns;
4. reproduce or delegate a run in an isolated declared environment;
5. compare revisions and see exactly which review changed what;
6. export the artifact, provenance, evidence, and review record without platform lock-in.

The pilot deliberately builds only steps 1–3 at notebook-file scope and the review/revision part of step 5. It keeps the data model open to later evidence records without making unearned claims today.

## 6. Product/CEO review

### Principal corrections made

- Moved notebook/cell comments from a later social phase into the MVP wedge.
- Removed votes, ranking, forking, execution, repository sync, and private workspaces from the pilot.
- Replaced traffic/upload-only success with recruited reviewers, substantive reviews, owner responses, revisions, complete loops, repeat actions, and interviews.
- Added a required `Question for reviewers` to make review actionable.
- Made versions immutable and comments version/cell-ID specific.
- Added trust language that forbids rendering from being described as reproduction.
- Added invite-only publishers, assigned reviewers, minimal notifications, moderation, scoped restrictions, policies, and operational launch gates.

### Scorecard after correction

| Dimension | Score | Remaining issue |
|---|---:|---|
| Problem clarity | 9/10 | Needs cohort interviews to confirm language and urgency. |
| User value | 8/10 | Must prove reviewers and owners return without heavy operator labor. |
| Differentiation | 7/10 | Public non-Git review is plausible; Git-first option overlaps ReviewNB. |
| Prioritization | 9/10 | Pilot now has one loop and strong scope cuts. |
| Trust/evidence honesty | 9/10 | Future independent-execution semantics remain intentionally undefined. |
| Pilot rigor | 9/10 | Cohort recruiting and analytics dictionary still need named owners. |
| Operational viability | 8/10 | Legal policy, moderation staffing, email provider, and isolation must clear M0/M7 gates. |

Product review disposition: **ready for owner decision, with ingestion source as an explicit taste/cohort choice**.

## 7. Independent design review

The first design pass scored the original draft **7/10** and found one P0 architecture/interaction contradiction: the UX required parent-owned cell selection and review controls while the architecture placed the entire notebook inside an inaccessible cross-origin iframe.

The specification was corrected to use an application-owned cell shell with isolated per-output frames. The design pass also required the full revision and return loop, which is now specified.

### Original review scores and remediation

| Dimension | Initial | Remediation in current draft |
|---|---:|---|
| Information architecture | 8/10 | Added supporting profile, trust, invitation, unavailable, assignment, and revision screens. |
| Notebook reading | 8/10 | Added review question, persistent trust sentence, outline, review markers, version switcher, and compact technical disclosure. |
| Contextual review | 5/10 | Replaced whole-notebook iframe with app-owned cell shell; specified notebook-level entry and mobile inline review. |
| Publisher/revision workflow | 6/10 | Added `Create revised version`, change summary, addressed-thread linkage, and historical banner. |
| Interaction/failure states | 9/10 | Added comment edit/permalink/report and notification failure behavior. |
| Responsive/accessibility | 7/10 | Chose one mobile pattern and added frame focus, forced colors, error summary, zoom, table/equation cases. |
| Visual system | 8/10 | Kept calm editorial direction and required three mockups before UI implementation. |

Design review disposition after remediation: **ready for engineering review; visual taste still requires owner and mockup approval**.

Follow-up on 2026-07-20: the owner approved the complete responsive M0 mockup set without amendment.
D024 and [`docs/design/m0/README.md`](./design/m0/README.md) are the current approval record; the
sentence above preserves the independent review's pre-approval disposition.

## 8. Engineering review

The first independent engineering pass scored implementation readiness **6.5/10** and blocked approval on five integrity/lifecycle defects. The documents were corrected, then independently re-reviewed. Final specification readiness is **8.9/10**. Built-product readiness remains low because none of these contracts has been implemented or proven and the exploratory scaffold is still broken.

### Blocking findings and remediation

| Initial P0 finding | Remediation in current draft |
|---|---|
| A browser could overwrite the object later treated as immutable. | Browser writes only to `incoming`; a server-owned verifier streams/hashes those bytes and conditionally promotes the same local bytes to a distinct no-overwrite accepted key. Render/publication use accepted objects only. |
| One worker was required both to poll network services and have no egress. | Split a DB/R2-allowlisted orchestrator from a credential-free converter that receives only local paths and has no network. Deployment enforcement is an M0 go/no-go proof. |
| The model could not represent drafts, revisions, restrictions, and safe rerenders. | Added explicit mutable drafts, accepted/recovery originals, immutable source versions, render revisions/activations, version-thread links, and orthogonal visibility/restriction/review-moderation states. |
| At-least-once jobs could commit after lease loss or draft replacement. | Added lease token + monotonic generation fencing, heartbeat/terminal compare-and-set, immutable upload binding, active-generation checks, and versioned artifact identity. |
| Immediate containment conflicted with immutable caching and preview access. | Replaced caching claims with `no-store`, short on-demand signed capabilities, exact-generation preview authorization, a measured ≤60-second new-request restriction bound, and honest no-recall language. |

### P1 findings resolved

- Completed the data model, API/authorization matrix, canonical-request idempotency records, fenced notification outbox, failure/dead-letter behavior, and public/private export boundaries.
- Froze public handles/slugs; added database PITR plus separately credentialed accepted-original recovery objectives and restore proof.
- Defined the exact versioned cell-ID algorithm, invalid/missing-ID rules, golden/property tests, and early cohort-source audit before ingestion implementation.
- Added privacy-safe pilot events, application-origin CSP, operator bootstrap/reauth/MFA, additive non-possessory roles, verified private contact, and keyed email lookup.
- Reconciled owner-address versus reviewer-resolution, moderation close/restore, comment editing, notification settings, assignment acceptance, static demonstration, and removal of unsupported execution claims.
- Added on-demand output capability refresh, incoming overwrite/promotion races, stale fencing, provider-ack ambiguity, restriction, fuzz, and recovery coverage.

Engineering review disposition after final reconciliation: **no P0 engineering blocker remains; ready for owner approval to begin Milestone 0 only**. Promotion, converter isolation, capability/restriction, identity/contact, recovery, or provider feasibility failure in M0 is a redesign trigger—not permission to weaken the boundary.

## 9. Failure and rescue review

The plan explicitly designs these shadow paths rather than postponing them:

- upload expires, mismatches checksum, is abandoned, or is finalized twice;
- notebook JSON/format/cell IDs/decoded output/resource limits fail;
- orchestrator/converter crashes, loses a lease, times out, repeats delivery, or writes artifacts before DB commit;
- manifest fails schema/MIME policy or an output cannot be displayed safely;
- publication conflicts or preview becomes stale;
- comment/session/rate-limit/double-submit fails without losing draft text;
- notification provider fails after review is saved;
- content is reported, restricted, restored, or legally removed;
- OAuth provider, database, storage, content origin, renderer, or mail is unavailable;
- deployment introduces an unsafe render or incompatible schema/manifest;
- backup must restore version/review/artifact relationships.

Each path has a named state, user-safe message, operator detail, retry/containment rule, audit/metric, and test location in the architecture/security/test documents.

## 10. Assumption ledger

| Assumption | Risk if wrong | How it is tested | Decision point |
|---|---|---|---|
| Target owners will publish real notebooks publicly. | No supply or legal/privacy blockers. | Recruit and inventory at least 8 candidate notebooks in M0.1a; confirm launch schedule in M7.7. | M0/M7 |
| Reviewers value cell context over current tools. | Core wedge has no incremental value. | Assigned review behavior and interviews. | M8 |
| Direct upload is acceptable. | Cohort demands Git source workflow. | Pre-build cohort source audit; 80% Git rule. | M0.1a |
| Static saved output is still useful to inspect. | Users need execution to evaluate anything. | Pilot interviews and substantive review rate. | M8 |
| App-owned shell supports representative notebooks safely. | Compatibility or sanitizer risk makes display poor/unsafe. | M0 hostile + real fixture spike. | M0 |
| Proposed limits cover pilot notebooks. | Valid notebooks fail or conversion risk grows. | Candidate corpus measurements. | M0/M7 |
| GitHub/ORCID identity fits users. | Sign-in friction or credentials block launch. | Provider spike and onboarding observation. | M0/M8 |
| Transactional email closes the return loop. | Users ignore it or delivery/policy burden grows. | Delivery tests and repeat-action metric. | M0/M8 |
| One operator can moderate the cohort. | Unsafe content/support backlog. | Staging drills and pilot workload log. | M7/M8 |

## 11. Explicit non-goals and later triggers

| Deferred item | Why deferred | Evidence required to reconsider |
|---|---|---|
| Browser/cloud execution | Dominates security/compatibility/cost; not needed for review test. | Review loop succeeds; compatibility and threat study approved. |
| GitHub sync | Mutable source and webhook/token complexity. | Chosen ingestion works; repeated source-link demand. |
| Votes/ranking/reputation | Distorts early norms and does not create qualified review. | Enough organic activity to define quality/abuse model. |
| Fork/edit/diff | Requires lineage/editor/diff semantics. | Users repeatedly revise externally and need native comparison. |
| Private workspaces/SSO | Different permissions and business product. | Public pilot succeeds and institutional demand is evidenced. |
| DOI/reproducibility badge | Requires preservation and evidence governance. | Retention/evidence partnerships and semantics approved. |
| Dataset hosting | Rights, privacy, storage, environment scope. | Review is blocked repeatedly by unavailable data. |

## 12. Owner decisions and recommendation

### Product and scope

1. Approve the narrower wedge: public notebook- and cell-level contextual review, not generic notebook hosting.
2. Approve no execution, votes, forks, ranking, repository sync, or private workspaces in the pilot.
3. Approve invite-only publishing, an assigned-review cohort, the strengthened success gates, and no expansion based on traffic/upload counts alone.
4. Approve immutable accepted/source versions, explicit mutable drafts, visible version lineage/change summaries, audited render revisions, and narrow trust labels.
5. Approve owner `addressed` versus root-reviewer `resolved/reopened`, independent moderation close/restore, and a 15-minute author edit window.

### Taste choices

6. **Ingestion source rule:** approve direct upload by default, with GitHub exact-commit selected only if the M0 cohort audit meets the documented 80% threshold; build one path.
7. **Brand:** approve light editorial/technical design with astronomy kept subtle, or request another direction.
8. **Review placement:** approve sticky rail on desktop and inline expansion on mobile.
9. **Provenance density:** approve essential facts up front and full digest/renderer/kernel details in disclosure.
10. **Demonstration:** permit one separately stored block labeled `Product demonstration`, or require a text-only empty homepage until real publications exist.

### Platform and operations

11. Approve GitHub + ORCID with GitHub-only fallback, verified private contact, and additive non-possessory publisher/operator capabilities.
12. Approve frozen public handles/slugs and the rule that revoking publisher capability never transfers ownership or silently changes existing publications.
13. Approve the app-owned cell shell, isolated rich-output origin, incoming-to-accepted promotion, fenced jobs/generations, short on-demand capabilities/no-store, and separate recovery copy as mandatory integrity/security boundaries.
14. Approve minimal transactional email, with provider and dispatcher topology selected/proven in M0.
15. Approve Railway + PostgreSQL, private R2, Cloudflare content gateway, Python orchestrator/converter, and no Redis only if M0 proves the documented isolation/recovery requirements.
16. Approve or amend the proposed file/output limits, RPO/RTO, success criteria, and launch gates.
17. Name owners for repository license, notebook-license menu, terms/privacy/AUP/copyright/retention/moderation work.

## 13. Approval semantics

- **Approve all:** mark accepted decisions and begin Milestone 0 only.
- **Approve with amendments:** update every affected specification before implementation.
- **Request another review:** leave T000 active and perform the requested product/design/engineering pass.
- **Reject/reframe:** preserve this packet as historical and replace `INTENT.md` before any build.

Approval does not pre-authorize Milestones 1–8 regardless of evidence. Each milestone gate must pass, and the cohort pilot ends in an explicit proceed/iterate/stop-or-reframe decision.
