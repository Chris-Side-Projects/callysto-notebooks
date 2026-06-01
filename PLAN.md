# PLAN.md - Callysto Notebooks

*Architecture and phased roadmap. Update as decisions are made.*

**Status:** Pre-build — awaiting Chris answers to open questions in INTENT.md

---

## Phase 0 — Foundation (now)

- [x] Domain: callysto.io (purchased 2026-06-01)
- [x] GitHub: Chris-Side-Projects/callysto-notebooks
- [ ] Decide stack (see Stack Decision below)
- [ ] Decide core feature set for v1
- [ ] Write DEVELOPER_NOTES.md once stack is chosen
- [ ] Set up CI/CD skeleton

---

## Phase 1 — MVP (read-only browsing)

Goal: Public can browse and view submitted notebooks. No auth required.

Features:
- Submit a notebook (paste GitHub URL or upload .ipynb)
- Notebook stored and rendered statically
- Browse by category / tag / date
- Simple homepage with recent + featured

Success metric: 10 real notebooks published by real people

---

## Phase 2 — Social layer

Goal: Community can engage with notebooks.

Features:
- GitHub OAuth login
- Comments on notebooks
- Upvotes / quality signals
- Notebook author profile pages
- Forking (link derivative work back to original)

---

## Phase 3 — Review layer

Goal: Structured peer review, not just comments.

Features:
- Line-level annotation (like a code review)
- Review status (needs-work / approved / under-review)
- Version history with diffs
- Citation links (notebook A references notebook B)

---

## Phase 4 — Ecosystem

Goal: Become the canonical home for open executable analysis.

Options (TBD):
- Dataset hosting alongside notebooks
- Model cards / experiment tracking
- Institutional pages (a lab or team's public notebook portfolio)
- API for programmatic access / embedding

---

## Stack Decision (TBD)

**Options under consideration:**

| Layer | Option A | Option B |
|-------|----------|----------|
| Frontend | Next.js | SvelteKit |
| Backend | FastAPI (Python) | Next.js API routes |
| DB | PostgreSQL | SQLite → Postgres |
| Notebook render | nbconvert static HTML | react-ipynb or similar |
| Auth | NextAuth (GitHub) | Clerk |
| Storage | R2 / S3 | Supabase storage |
| Hosting | Railway | Vercel + Railway |

**Recommendation (pending Chris input):**
Next.js + PostgreSQL + nbconvert for rendering + GitHub OAuth + R2 storage + Railway deploy.
Rationale: matches existing stack patterns (xcap-hq, xcap-terminal), familiar tooling, fast to ship.

---

## Key Architectural Decisions

### Notebook Rendering
- Convert .ipynb → static HTML at upload time (via nbconvert)
- Store rendered HTML in R2/S3
- Serve directly — no re-execution
- Rationale: security, speed, simplicity

### Storage
- Raw .ipynb files: object storage (R2)
- Rendered HTML: object storage (R2)
- Metadata (title, author, tags, stats): PostgreSQL
- Comments/reviews: PostgreSQL

### Auth
- GitHub OAuth only for v1 (natural fit for the audience)
- Expand later if needed

---

## Non-Goals (v1)

- In-browser notebook execution
- Private/paid tiers
- Mobile-native experience
- Real-time collaboration
