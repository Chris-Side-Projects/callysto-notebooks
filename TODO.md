# TODO.md - Callysto Notebooks

*Single source of truth for active work. Update after every session.*

---

## 🔴 Active

*Nothing in progress yet.*

---

## 🟡 Up Next (Phase 0 — Foundation)

- [x] Scaffold Next.js project (`npx create-next-app@latest`)
- [ ] Set up Railway project: app service + PostgreSQL add-on
- [ ] Create R2 bucket: `callysto-notebooks`
- [ ] Configure DNS: callysto.io → Railway deployment (Cloudflare)
- [ ] Set up GitHub Actions: lint + build on push to main
- [ ] Write DEVELOPER_NOTES.md (local dev setup, env vars, deploy)
- [ ] Deploy empty shell (just homepage placeholder) to callysto.io

---

## 🟢 Backlog — Phase 1 (Read + Publish)

### Notebook submission
- [ ] Upload .ipynb file endpoint + R2 storage
- [ ] GitHub URL fetch + store endpoint
- [ ] GitHub OAuth repo connect (auto-sync)
- [ ] nbconvert render pipeline (Python microservice or CLI step)
- [ ] Notebook metadata form (title, description, tags, study link)
- [ ] Draft / publish toggle

### Auth
- [ ] NextAuth setup: GitHub OAuth
- [ ] NextAuth: Google OAuth
- [ ] NextAuth: email magic link
- [ ] ORCID OAuth provider (custom — ORCID uses OAuth 2.0)
- [ ] User profile creation on first login

### Browsing
- [ ] Notebook detail page (render stored HTML)
- [ ] Homepage: recent + featured notebooks
- [ ] Explore page with filters (tag, language, date)
- [ ] User profile page

### Database
- [ ] PostgreSQL schema (see PLAN.md data model)
- [ ] Migration tooling (Drizzle ORM or Prisma)

---

## 🟢 Backlog — Phase 2 (Comments + Votes)

- [ ] Inline cell-level comment system
- [ ] Threaded replies
- [ ] Markdown rendering in comments
- [ ] Notebook upvotes
- [ ] Comment upvotes
- [ ] Ranked feeds (Recent / Top / Trending)
- [ ] Notification system (reply to your comment, fork of your notebook)

---

## 🟢 Backlog — Phase 3 (Fork + Run)

- [ ] Fork a notebook (copy + link back to parent)
- [ ] Fork diff view (cell-level changes from parent)
- [ ] Sandboxed execution container (Docker + Jupyter Server)
- [ ] Execution queue (Redis + BullMQ)
- [ ] Resource limits enforcement (CPU/RAM/timeout)
- [ ] Python 3 kernel support
- [ ] Save execution outputs to fork

---

## 📋 Design / Product

- [ ] Wireframes: homepage, notebook detail, submit flow, profile, explore
- [ ] Visual identity / logo (Callysto + moon motif)
- [ ] Landing page copy (pre-launch)
- [ ] Email capture for early access

---

## ✅ Done

- [x] Purchase callysto.io (2026-06-01, GoDaddy, $59.99/yr, order #4101768411)
- [x] Create GitHub repo: Chris-Side-Projects/callysto-notebooks (2026-06-01)
- [x] Write INTENT.md, PLAN.md, TODO.md, CLAUDE.md, CODING.md, README.md
- [x] Decide stack: Next.js + PostgreSQL + R2 + nbconvert + NextAuth + Railway
- [x] Decide execution model: read-only v1, sandboxed execution v3
- [x] Decide open source: yes (MIT/Apache 2.0)
- [x] Decide monetization: free for individuals, institutional plans later
- [x] Scaffold Next.js app router project with TypeScript, Tailwind, Drizzle schema, and initial pages
