# TODO.md - Callysto Notebooks

*Active task list. Update constantly.*

---

## 🔴 Blocking (need Chris answers first)

- [ ] Answer open questions in INTENT.md (rendering, auth, submission flow, monetization, scope)
- [ ] Decide stack (see PLAN.md Stack Decision)
- [ ] Decide v1 feature set (which Phase 1 features are truly MVP)

---

## 🟡 Ready once stack decided

- [ ] Scaffold project (Next.js or chosen framework)
- [ ] Set up Railway project + PostgreSQL
- [ ] Configure R2 bucket for notebook storage
- [ ] Set up GitHub Actions CI (lint + build)
- [ ] Write DEVELOPER_NOTES.md (local dev setup, env vars, deploy steps)
- [ ] Set up DNS: callysto.io → deployment

---

## 🟢 Design / product (can start now)

- [ ] Sketch wireframes for: homepage, notebook detail page, submit flow, profile page
- [ ] Define data model: notebooks, users, comments, reviews, tags
- [ ] Define submission UX: GitHub URL paste vs file upload vs GitHub App integration
- [ ] Define notebook metadata schema (title, description, tags, language, dependencies)
- [ ] Design URL structure: callysto.io/@username/notebook-slug

---

## 📋 Backlog

- [ ] Logo / visual identity
- [ ] Landing page (callysto.io pre-launch)
- [ ] Email capture for early access / launch
- [ ] Decide on open source vs closed source
- [ ] License decision
- [ ] Outreach plan (HN, data science communities, Twitter)

---

## ✅ Done

- [x] Purchase callysto.io domain (2026-06-01, GoDaddy, $59.99/yr)
- [x] Create GitHub repo: Chris-Side-Projects/callysto-notebooks (2026-06-01)
- [x] Write INTENT.md, PLAN.md, TODO.md, CLAUDE.md, CODING.md
