# AGENTS.md - Callysto Notebooks

*Instructions for AI coding agents working on this project.*

---

## Before You Touch Anything

1. Read `INTENT.md` — understand what this project is and why
2. Read `PLAN.md` — understand the architecture and current phase
3. Read `TODO.md` — understand what's active and what's next
4. Read `DEVELOPER_NOTES.md` — understand the stack and local setup
5. Read `CODING.md` — the coding standards you must follow

Do not skip these. Do not infer from file names alone.

---

## Git Identity (MANDATORY)

```
name:  edwardtheclaw
email: edward.the.claw@gmail.com
```

Never use Chris's personal email for commits.

---

## Commit Style

```
type(scope): short description

Examples:
feat(auth): add GitHub OAuth via NextAuth
fix(render): handle notebooks with missing metadata
chore(deps): update nbconvert to 7.x
```

---

## Rules

- **No new dependencies without flagging.** If you need a new package, note it in your output and wait for approval.
- **Match existing code style exactly.** Indentation, naming, import order — match what's already there.
- **Handle errors explicitly.** No silent catch blocks. No `// TODO: handle error`.
- **Run the build before finishing.** `npm run build` must pass with zero type errors before you call a task done.
- **Never commit secrets.** `.env.local`, API keys, tokens — none of these ever go in git.
- **Report with verification level:**
  - **(verified)** = I built and tested it myself
  - **(sub-agent reported)** = I'm relaying a claim I didn't test — never acceptable for code tasks

---

## Current Phase

See `TODO.md` for what's active. Currently in **Phase 0 — Foundation**.
Do not build Phase 2 or 3 features until Phase 1 is complete.

---

## Key Technical Constraints

- Notebook rendering is **build-time / upload-time only** — never re-executed at read time
- Execution is **client-side via Pyodide** (Phase 3) — do not add server-side execution infrastructure to Phase 1 or 2
- Cloud execution fallback is Phase 3+ and only for notebooks Pyodide can't handle
- Auth must support: GitHub, Google, email magic link, ORCID
- All notebook files (`.ipynb` + rendered HTML) live in **Cloudflare R2**, not the database
- The database (PostgreSQL) holds only metadata, user data, comments, votes
