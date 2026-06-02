# PLAN.md - Callysto Notebooks

*Architecture and phased roadmap.*

**Status:** Pre-build — stack decided, starting Phase 0 completion.

---

## Phases

### Phase 0 — Foundation *(now)*

- [x] Domain: callysto.io (purchased 2026-06-01)
- [x] GitHub: Chris-Side-Projects/callysto-notebooks
- [x] INTENT.md, PLAN.md, TODO.md, CLAUDE.md, CODING.md
- [ ] Finalize stack (see Stack section below)
- [ ] Scaffold project structure
- [ ] Set up CI/CD (GitHub Actions: lint + build + test)
- [ ] Set up Railway project + PostgreSQL + R2
- [ ] Write DEVELOPER_NOTES.md
- [ ] Deploy empty shell to callysto.io

---

### Phase 1 — Read + Publish *(MVP)*

Goal: Anyone can publish a notebook. Anyone can read it. No auth required to browse.

**Submission methods (all three):**
- Upload a `.ipynb` file directly
- Paste a GitHub file URL (auto-fetched and stored)
- Connect a GitHub repo via OAuth (auto-sync on push)

**Notebook rendering:**
- Convert `.ipynb` → static HTML at upload time via `nbconvert`
- Store raw `.ipynb` + rendered HTML in R2
- Serve rendered HTML — no re-execution at read time
- Metadata (title, author, tags, description, study link) in PostgreSQL

**Auth:**
- GitHub OAuth
- Email/password (magic link or traditional)
- Additional providers matching the researcher/technical audience:
  - ORCID (the standard academic identity — critical for the reproducibility use case)
  - Google OAuth
  - Institutional SSO (SAML/ADFS) — Phase 3+

**Success metric:** 10 real notebooks published by people other than Chris.

---

### Phase 2 — Comment + Vote *(Social layer)*

Goal: Community can engage with notebooks at the cell level.

**Comments:**
- Inline cell-level comments (attach to a specific cell index)
- Threaded replies
- Markdown support in comments
- Free-form, like a code review — no structured review form required

**Voting:**
- Upvote notebooks (HN-style, no downvotes initially)
- Upvote individual comments
- Ranked feeds: Recent / Top / Trending

**Profiles:**
- Public profile page per user
- Notebook portfolio
- Contribution history (comments, forks, published notebooks)

---

### Phase 3 — Fork + Run *(Execution layer)*

Goal: Anyone can fork a notebook and run it on the platform.

**Forking:**
- Fork any notebook to your own profile
- Forked notebooks link back to the original (and vice versa — "N forks")
- Diff view between a fork and its parent (cell-level changes)

**Execution — client-side first (Pyodide/WebAssembly):**
- Notebooks run directly in the user's browser via **Pyodide** (CPython compiled to WASM)
- Zero server-side compute cost — the user's machine does all the work
- No data leaves the user's machine during execution
- Scales to unlimited concurrent users for free
- Supported: Python 3, NumPy, pandas, matplotlib, scikit-learn, SciPy, and most of the scientific Python stack
- Not supported client-side: packages requiring native C extensions not in Pyodide, GPU compute, R, Julia (initially)
- First load: ~20-40MB WASM bundle (cached by browser after first run)
- Implementation: embed **JupyterLite** kernel or use Pyodide directly via `@pyodide/pyodide` npm package
- Users can modify cell inputs and re-run; outputs saved to their fork

**Execution — cloud fallback (v3+, optional):**
- For notebooks flagged as "heavy" (GPU, non-Pyodide packages, R/Julia)
- Sandboxed ephemeral containers (Docker + repo2docker)
- Queue-based, resource-limited, time-limited
- Only triggered when Pyodide can't handle the notebook's requirements
- Requirement detection: parse `requirements.txt` / `environment.yml` / kernel metadata at upload time and flag incompatible packages

---

### Phase 4 — Expand *(Ecosystem)*

Goal: Become the canonical home for open executable analysis, beyond just notebooks.

Candidates:
- Dataset hosting alongside notebooks (link a dataset to a notebook)
- Model cards / experiment tracking
- Institutional/lab pages (private workspaces for teams, universities)
- Embeddable notebooks (drop a Callysto notebook into any webpage)
- API for programmatic submission and retrieval
- "Verified Replication" badge system (community-confirmed reproducibility)

---

## Stack

### Decided

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | Next.js (TypeScript) | Matches existing projects, fast dev, SSR for SEO |
| Backend | Next.js API routes + Python microservice for execution | API routes for CRUD; Python needed for nbconvert + Jupyter kernel |
| Database | PostgreSQL (Railway) | Relational, handles notebooks + users + comments cleanly |
| Object storage | Cloudflare R2 | Already have CF account, cheap, fast, S3-compatible |
| Notebook rendering | nbconvert (Python) | Battle-tested, produces clean HTML from .ipynb |
| Auth | NextAuth.js | GitHub + Google + email/magic-link; ORCID via custom provider |
| Hosting | Railway | Consistent with other projects |
| CDN | Cloudflare | Already managing callysto.io DNS |

### Phase 3 additions (execution)

| Layer | Choice | Notes |
|-------|--------|-------|
| Client-side execution | Pyodide + JupyterLite | Runs in browser, zero infra cost |
| WASM Python kernel | `@pyodide/pyodide` npm package | Loaded client-side, ~20-40MB cached |
| Cloud fallback (heavy notebooks) | Docker + repo2docker | Only for GPU/non-Pyodide packages |
| Cloud queue | Redis + BullMQ | Only needed if cloud fallback is enabled |
| Cloud execution hosting | fly.io ephemeral containers | Cheaper than Railway for burst workloads |

---

## Data Model (v1)

```
users
  id, username, email, auth_provider, auth_provider_id
  display_name, bio, avatar_url, created_at

notebooks
  id, slug, title, description, tags[]
  owner_id (→ users), parent_notebook_id (→ notebooks, for forks)
  study_url, study_title           -- link to original paper if applicable
  ipynb_path (R2 key), html_path (R2 key)
  kernel_language, kernel_name
  cell_count, published_at, updated_at
  vote_count, fork_count, comment_count, view_count
  status: draft | published | unlisted

comments
  id, notebook_id (→ notebooks), cell_index (nullable — null = top-level)
  parent_comment_id (→ comments, for threads)
  author_id (→ users), body (markdown), created_at
  vote_count, is_deleted

votes
  id, user_id, target_type (notebook|comment), target_id, created_at

notebook_versions
  id, notebook_id, version_num, ipynb_path, html_path, created_at, change_summary
```

---

## URL Structure

```
callysto.io/                          homepage (recent + featured)
callysto.io/explore                   browse all notebooks
callysto.io/@username                 user profile
callysto.io/@username/notebook-slug   notebook detail page
callysto.io/@username/notebook-slug/fork   fork this notebook
callysto.io/submit                    submit a notebook
callysto.io/topics/statistics         tag/topic page
```

---

## Open Source Strategy

- Code is fully open source (MIT or Apache 2.0)
- Hosted platform is free for individuals
- Institutional plans later: private workspaces, team management, analytics
- This follows the GitHub/GitLab/Posit model: open code, monetize the hosted service
- Being open source is a trust signal for the scientific community — essential for the reproducibility use case

---

## Agent Pipeline (from Tournament 2026-06-02)

Based on a 4-agent tournament (Claude, Codex, Gemini, Grok) on Task 1 (Vote Button):

| Role | Recommended Agent | Notes |
|------|-------------------|-------|
| Planning | Codex (gpt-5.5) or Claude | Codex edges Claude on planning with upgraded models |
| Building | **Claude** | Won build in both baseline and upgraded rounds |
| QA / Review | Multi-agent panel | Majority vote; catches more issues than single reviewer |

Common risk: mock data vs. real DB wiring. Always specify in task specs.
Full results: `docs/agent-tournament.md`

---

## Non-Goals (v1 + v2)

- In-browser execution (v3 only)
- Private notebooks (v1 is all-public)
- Mobile-native app
- Real-time collaborative editing (not a Google Docs replacement)
- Replacing arXiv or peer review journals
