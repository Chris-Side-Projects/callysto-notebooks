# Callysto research notes

- Status: **RESEARCH BASIS FOR PROPOSED SPECIFICATION**
- Last reviewed: 2026-07-19
- Scope: product landscape and primary technical constraints for the invite-only pilot
- Product decisions live in [`DECISIONS.md`](../DECISIONS.md); requirements live in [`PRODUCT_SPEC.md`](../PRODUCT_SPEC.md) and [`ARCHITECTURE.md`](../ARCHITECTURE.md)

This is an evidence ledger, not a substitute for a product decision. It distinguishes what a source says from what the Callysto team infers and what the proposed specification chooses.

## 1. Evidence labels and method

- **SOURCED FACT** — a statement supported directly by the linked primary or first-party documentation.
- **PRODUCT INFERENCE** — a conclusion drawn from one or more facts for Callysto; it is not claimed by the source.
- **PROPOSED DECISION** — a recommendation recorded in `DECISIONS.md` and awaiting owner approval.
- **OPEN QUESTION** — a fact or choice that must be validated before implementation or launch.

The research favored official project, platform, and product documentation over summaries. Product pages are evidence of documented capability, not independent evidence of adoption, quality, security, or market size. Links and platform behavior can change; implementation milestones must re-check integration-specific details against current documentation.

## 2. Product landscape

### GitHub notebook rendering

- **SOURCED FACT:** GitHub documents support for working with Jupyter Notebook files in repositories and renders a static notebook view. [GitHub — Working with Jupyter Notebook files on GitHub](https://docs.github.com/en/repositories/working-with-files/using-files/working-with-non-code-files)
- **PRODUCT INFERENCE:** Static notebook viewing is already a familiar baseline. A Callysto pilot that only uploads and renders notebooks would test hosting, not a differentiated review workflow.
- **PROPOSED DECISION:** Contextual notebook-level and cell-level review is part of the MVP (D001), while repository sync is deferred (D003).

### ReviewNB

- **SOURCED FACT:** ReviewNB documents cell-level notebook diffs, comments, and review within GitHub pull-request workflows. [ReviewNB documentation](https://docs.reviewnb.com/)
- **PRODUCT INFERENCE:** Cell-level review is neither novel by itself nor an empty market. Callysto must distinguish itself through a public, version-specific review record accessible to readers and publishers who are not all working inside one Git repository or pull request.
- **OPEN QUESTION:** A GitHub-commit-first Callysto could shorten ingestion work for Git-native users, but would overlap more directly with ReviewNB and exclude some non-Git publishers. This remains the principal product taste alternative to direct upload.

### Binder

- **SOURCED FACT:** Binder documents a service that turns a repository containing computational content and environment configuration into a reproducible, interactive environment accessible through a browser. [Binder introduction](https://mybinder.readthedocs.io/en/latest/introduction.html)
- **PRODUCT INFERENCE:** Recreating on-demand compute environments introduces repository, dependency, image-build, runtime, cost, and abuse concerns that are not necessary to test Callysto's contextual-review premise.
- **PROPOSED DECISION:** The pilot does not execute notebooks or promise an interactive environment (D002, D012).

### Code Ocean

- **SOURCED FACT:** Code Ocean describes a compute capsule as a shareable package containing code, data, environment, and results. [Code Ocean — What is a Compute Capsule?](https://docs.codeocean.com/osl-guide/getting-started/what-is-a-compute-capsule)
- **PRODUCT INFERENCE:** A notebook file plus saved output is a narrower artifact than a captured code/data/environment capsule. Rendering a notebook cannot establish the stronger reproducibility evidence associated with a complete computational environment.
- **PROPOSED DECISION:** Callysto uses limited platform-check labels and does not claim `reproducible`, `verified`, `correct`, or `independently reproduced` in the pilot (D011).

### Whole Tale

- **SOURCED FACT:** Whole Tale documents a platform for creating, publishing, and executing reproducible research artifacts called tales. [Whole Tale user guide](https://wholetale.readthedocs.io/en/stable/)
- **PRODUCT INFERENCE:** Full reproducible-research environments are an adjacent, broader category. Callysto can later interoperate with environment/capsule systems rather than making compute-environment capture a prerequisite for public review.
- **PROPOSED DECISION:** Direct notebook publication and contextual review form the pilot wedge; full compute capsules are deferred.

### ResearchEquals

- **SOURCED FACT:** ResearchEquals presents a platform for publishing modular research steps and outputs as research modules rather than only a final paper. [ResearchEquals](https://researchequals.com/en-US)
- **PRODUCT INFERENCE:** There is demand for research communication at a more granular level than a conventional paper. Callysto's granularity is different: a stable notebook version and its cells, claims, provenance, and discussion.
- **OPEN QUESTION:** The pilot should test whether notebook-context review is materially better than publishers' and reviewers' current combinations of GitHub, documents, email, and meetings; landscape adjacency does not prove demand.

### Product conclusion

- **PRODUCT INFERENCE:** The least-duplicative pilot is not “a public place that can display `.ipynb` files.” It is a public review layer for computational claims made in notebooks: publish an immutable artifact, inspect a stable cell, discuss it in context, and preserve the author response or revision.
- **PROPOSED DECISION:** The core proof loop is `publish immutable version -> inspect cell/output -> contextual comment -> owner response/address, reviewer resolution, or revised version`.
- **PROPOSED DECISION:** Recruit/inventory the candidate cohort during Milestone 0. Use direct upload unless at least 80% of candidate notebooks already exist in accessible GitHub repositories and owners identify snapshot upload as a material barrier; otherwise use exact repository/path/commit import. Build one path only (D003).

## 3. Jupyter format and review anchors

### Notebook structure and cell IDs

- **SOURCED FACT:** The Jupyter Notebook format is a JSON document with top-level metadata, nbformat version fields, and a list of cells; code cells can contain saved outputs. [Jupyter nbformat description](https://nbformat.readthedocs.io/en/5.2.0/format_description.html)
- **SOURCED FACT:** Notebook format 4.5 introduced a required cell `id`; within a notebook IDs must be unique, 1–64 characters, and use letters, numbers, hyphen, and underscore. [Jupyter nbformat — Cell IDs](https://nbformat.readthedocs.io/en/5.2.0/format_description.html#cell-ids)
- **PRODUCT INFERENCE:** A cell ordinal is not a durable review anchor because insertion or movement changes position. A valid cell ID paired with an immutable notebook version can identify the reviewed cell without guessing by content.
- **PROPOSED DECISION:** Comments reference `version_id` + optional `cell_id`, never cell index (D007). For older notebooks with missing IDs, Callysto preserves the original and adds deterministic valid IDs only to a normalized copy; existing invalid or duplicate IDs fail validation.
- **OPEN QUESTION:** Milestone 1 must fixture-test notebooks across the explicitly supported nbformat versions and record normalization behavior in a versioned manifest.

### Saved output is not execution evidence

- **SOURCED FACT:** Code-cell outputs are stored in the notebook document and can include stream, display-data, and execution-result representations. [Jupyter nbformat — Code cell outputs](https://nbformat.readthedocs.io/en/5.2.0/format_description.html#code-cell-outputs)
- **PRODUCT INFERENCE:** A renderer can display stored output without knowing whether it came from the displayed code, what environment produced it, whether cells ran in order, or whether external data changed.
- **PROPOSED DECISION:** The pilot exposes `Format valid` and `Render complete`; neither implies scientific correctness or reproducibility. It does not collect an `Author-reported execution` badge until a later attestation/evidence model exists (D011).

## 4. Notebook rendering and active-content risk

### Jupyter's trust model

- **SOURCED FACT:** Jupyter's security documentation explains that notebooks can contain HTML and JavaScript output, and that untrusted HTML is sanitized while untrusted JavaScript is not displayed until the notebook is trusted. [Jupyter Notebook security](https://jupyter-notebook.readthedocs.io/en/5.7.3/security.html)
- **PRODUCT INFERENCE:** An uploaded notebook must be treated as active hostile content even when it came from an authenticated publisher or carries a trust signature created elsewhere. Callysto cannot inject notebook-controlled HTML, SVG, widget state, or other active MIME into its credentialed application origin.
- **PRODUCT INFERENCE:** Cell-level review requires application-owned cell anchors and controls. A single cross-origin notebook iframe would prevent the parent application from safely inspecting or controlling the notebook cell DOM.
- **PROPOSED DECISION:** The renderer produces a typed structured cell manifest. The application renders its own cell shell, escaped code/plain text, and a strict sanitized Markdown subset. Hostile or complex rich output is isolated per cell on a separate cookieless origin in sandboxed iframes without scripts or same-origin privilege, or replaced by a safe placeholder (D008).

### nbconvert behavior

- **SOURCED FACT:** nbconvert converts notebooks to static formats, including HTML; execution is a separate behavior invoked explicitly. [nbconvert documentation](https://nbconvert.readthedocs.io/en/latest/)
- **PRODUCT INFERENCE:** A Python render pipeline using `nbformat` and `nbconvert` as exporter-only tooling is smaller and more reviewable than adding an execution runtime.
- **PROPOSED DECISION:** A DB/R2-allowlisted orchestrator invokes a credential-free no-network converter that exports saved inputs/outputs without `ExecutePreprocessor`, kernel startup, or external retrieval (D002, D009).
- **OPEN QUESTION:** Milestone 0 must prove an orchestrator can reach only PostgreSQL/private R2 while a credential-free converter receives local paths with no network. It must pin every renderer/output-policy/normalization/schema version and validate hostile MIME behavior.

### Browser-side execution limitations

- **SOURCED FACT:** JupyterLite documents WebAssembly/browser constraints including limitations involving some native extensions, system packages/libraries, threads/processes, and the browser filesystem. [JupyterLite troubleshooting and limitations](https://jupyterlite.readthedocs.io/en/stable/troubleshooting.html)
- **PRODUCT INFERENCE:** “Run in browser” would not provide uniform compatibility across real-world notebooks, and would create a different security and user-expectation contract.
- **PROPOSED DECISION:** Client-side execution is deferred until the review loop demonstrates value and a compatibility study defines an honest supported subset (D002).

## 5. Direct object upload and delivery

### Presigned R2 URLs

- **SOURCED FACT:** Cloudflare documents R2 presigned URLs as temporary bearer URLs for a specific S3 operation; the signature is tied to the requested operation and object path, can expire, and can include constraints such as content type. Presigned URLs work with the R2 S3 API endpoint, not a custom domain. [Cloudflare R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- **PRODUCT INFERENCE:** The web process can authorize an exact incoming-object upload without proxying notebook bytes. Anyone holding the bearer URL can use it until expiry, including reusing that exact operation/key. Therefore the incoming key cannot be the accepted immutable original, and client metadata/`HEAD` alone cannot establish byte identity.
- **PROPOSED DECISION:** If direct upload is selected, a server-owned verifier streams/hash-verifies the incoming bytes and promotes those exact local bytes to a different no-overwrite accepted key before rendering (D018). The browser digest remains advisory.

### Public bucket guidance

- **SOURCED FACT:** Cloudflare labels an `r2.dev` public bucket URL as intended for non-production use and documents custom domains for production public access. [Cloudflare R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- **PRODUCT INFERENCE:** Public bucket exposure does not supply Callysto's required manifest validation, scoped restriction, content-type policy, expiring preview, or isolated response headers. A controlled content gateway is preferable to making the artifact bucket directly public.
- **PROPOSED DECISION:** Originals and derived artifacts remain in private R2. A dedicated content gateway serves only approved immutable renders on a separate cookieless origin; production does not use `r2.dev` (D008, D013).

## 6. Authentication and identity

### Next.js authorization guidance

- **SOURCED FACT:** Next.js authentication guidance separates authentication, session management, and authorization; it recommends using an authentication library and treating Route Handlers and Server Actions like public-facing API endpoints that need authorization checks. [Next.js authentication guide](https://nextjs.org/docs/app/guides/authentication)
- **PRODUCT INFERENCE:** Hiding a button or protecting a page layout is insufficient. Callysto needs shared server-only authorization functions for every mutation and ownership-scoped object lookup.
- **PROPOSED DECISION:** Auth.js is the proposed library boundary, and roles are enforced server-side as `member`, `publisher`, and `operator`.

### Auth.js

- **SOURCED FACT:** Auth.js provides authentication integrations for web applications, including Next.js and OAuth providers. [Auth.js documentation](https://authjs.dev/)
- **PRODUCT INFERENCE:** Using a maintained library reduces custom OAuth/session surface, but it does not remove the need for explicit account-linking, role, object-ownership, CSRF, cookie, and provider-token decisions.
- **OPEN QUESTION:** Milestone 0 must verify current GitHub and ORCID provider support, adapter behavior, required scopes, token retention, and safe linking in the chosen Auth.js version.

### ORCID

- **SOURCED FACT:** ORCID documents an OAuth flow for obtaining an authenticated ORCID iD; the user authorizes access and the API returns the authenticated identifier. [ORCID — Get an authenticated ORCID iD](https://info.orcid.org/documentation/api-tutorials/api-tutorial-get-and-authenticated-orcid-id/)
- **PRODUCT INFERENCE:** ORCID can provide researcher-domain identity, but it does not verify notebook correctness, authorship of every linked artifact, or scientific claims.
- **PROPOSED DECISION:** Pilot sign-in proposes GitHub + ORCID, with GitHub-only launch as a documented fallback if ORCID credentials, terms, or integration behavior block the milestone (D004).

## 7. Evidence and trust language

| Observation | What it supports | What it does **not** support |
|---|---|---|
| Notebook JSON passed supported-format validation | `Format valid` | Correct code, trusted output, safe data, reproducibility. |
| Static display manifest and permitted artifacts were generated | `Render complete` | Notebook execution, successful execution, scientific correctness. |
| Publisher says saved outputs came from an execution | A future attestation record, not a pilot badge | Independent observation, captured environment, same result on rerun. |
| A public thread exists | `Review discussion` | Peer review, resolution, reviewer expertise, correctness. |
| Owner replied/addressed/revised or reviewer resolved | A review loop occurred | That the critique was valid or the revision correct. |
| Later named reviewer runs a recorded environment and reports a result | Potential future independent-evidence record | General truth without the exact artifact/environment/result scope. |

**PRODUCT INFERENCE:** Trust is improved by showing exactly what was checked and preserving artifact/review history, not by using a single ambiguous badge.

**PROPOSED DECISION:** The pilot forbids `Verified`, `Reproducible`, `Independently reproduced`, `Correct`, and `Peer reviewed` unless a later evidence system defines and records the relevant act (D011).

## 8. Implications for the pilot specification

| Research result | Specification implication |
|---|---|
| Static notebook display already exists. | Cell/notebook discussion and author response belong in MVP, not a later social phase. |
| Notebook output can be active content. | App-owned cell shell, typed manifest, output policy, per-cell separate-origin sandbox, private storage, and scoped restriction are launch gates. |
| Saved outputs do not prove execution. | No execution/reproducibility language; show narrow evidence labels. |
| Cell IDs exist but older notebooks may omit them. | Preserve original, create deterministic IDs in a normalized copy, anchor review to version + ID. |
| Browser and capsule execution are materially larger products. | No execution in pilot; validate review value first. |
| Presigned upload URLs are bearer capabilities. | Exact key/operation/type, short expiry, no logging, finalize verification, lifecycle cleanup. |
| OAuth gives authenticated provider identity, not authorization. | Server-side role + ownership checks on every mutation; explicit account linking. |
| Adjacent products are often Git- or environment-centered. | Audit the cohort source workflow before selecting direct upload or exact-commit import; never build both in the pilot. |

## 9. Research gaps and milestone checks

The following are not resolved by desk research and must be answered with implementation evidence or pilot interviews:

1. **Cohort workflow:** Do target owners already use Git for the notebooks they want reviewed? This determines whether direct upload or exact-commit import is the better first wedge.
2. **Review value:** Will named reviewers submit substantive cell-level feedback, will owners reply/address/revise, and will reviewers resolve or reopen? Traffic and upload counts cannot answer this.
3. **ORCID feasibility:** Are production credentials, terms, provider integration, scopes, and account-linking behavior acceptable for the pilot?
4. **Notebook compatibility:** Which nbformat versions and output MIME types pass the safe-render policy across the real pilot corpus?
5. **Isolation proof:** Do real browsers enforce the proposed sandbox/CSP/origin boundary for every isolated per-cell artifact, while app-owned cell navigation/comments work without any cross-origin DOM access? Do sanitizer-bypass and MIME-confusion fixtures remain outside the application DOM?
6. **Operational limits:** Do the proposed 25 MiB source, 10 MiB single decoded output, 50 MiB total derived-display, 2,000-cell, and 60-second rendering targets cover real pilot notebooks without weakening resource safety?
7. **Moderation load:** What report, spam, copyright, privacy, and secret-exposure cases occur in an invite-only cohort, and can the named operator meet the response runbook?
8. **Legal policy:** Which notebook/content licenses, contributor terms, deletion/anonymization behavior, and retention periods are approved?
9. **Portability:** Does the metadata/review JSON export preserve enough context for users to leave without losing the public review record?

Each gap must be closed with a dated decision, test artifact, pilot result, or explicit accepted risk. A roadmap assumption is not evidence.

## 10. Source registry

| Topic | Primary/first-party source | Used for |
|---|---|---|
| Notebook format and cell IDs | [nbformat](https://nbformat.readthedocs.io/en/5.2.0/format_description.html) | JSON/cell/output structure, stable anchors, normalization constraints. |
| Notebook active-content trust | [Jupyter Notebook security](https://jupyter-notebook.readthedocs.io/en/5.7.3/security.html) | Hostile rich-output premise. |
| Static export | [nbconvert](https://nbconvert.readthedocs.io/en/latest/) | Export-only renderer choice and explicit separation from execution. |
| Browser execution constraints | [JupyterLite](https://jupyterlite.readthedocs.io/en/stable/troubleshooting.html) | Why browser execution is not a transparent universal pilot feature. |
| Direct object upload | [Cloudflare R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) | Bearer URL, operation/path/expiry/content-type constraints. |
| Public object delivery | [Cloudflare R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/) | Production endpoint guidance and gateway inference. |
| App authentication/authorization | [Next.js authentication](https://nextjs.org/docs/app/guides/authentication) | Library recommendation and server-side endpoint checks. |
| Authentication library | [Auth.js](https://authjs.dev/) | Proposed Next.js OAuth/session boundary. |
| Researcher identity | [ORCID OAuth](https://info.orcid.org/documentation/api-tutorials/api-tutorial-get-and-authenticated-orcid-id/) | Authenticated ORCID iD, not scientific verification. |
| Repository notebook display | [GitHub notebooks](https://docs.github.com/en/repositories/working-with-files/using-files/working-with-non-code-files) | Static-rendering baseline. |
| Git notebook review | [ReviewNB](https://docs.reviewnb.com/) | Cell-level diff/comment adjacency and Git-first alternative. |
| Repository-to-runtime | [Binder](https://mybinder.readthedocs.io/en/latest/introduction.html) | Interactive environment adjacency. |
| Compute capsules | [Code Ocean](https://docs.codeocean.com/osl-guide/getting-started/what-is-a-compute-capsule) | Code/data/environment/result scope comparison. |
| Reproducible research artifacts | [Whole Tale](https://wholetale.readthedocs.io/en/stable/) | Broader execution/environment platform adjacency. |
| Modular research publishing | [ResearchEquals](https://researchequals.com/en-US) | Granular research-output adjacency. |
