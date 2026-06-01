# DEVELOPER_NOTES.md - Callysto Notebooks

*Local dev setup, environment, deployment. Update as the stack gets built.*

**Status:** Stub — populate once project is scaffolded.

---

## Stack

- **Frontend + API:** Next.js (TypeScript) on Railway
- **Database:** PostgreSQL on Railway
- **Object storage:** Cloudflare R2 (`callysto-notebooks` bucket)
- **Notebook rendering:** Python + nbconvert (microservice or build-time step)
- **Auth:** NextAuth.js (GitHub, Google, email magic link, ORCID)
- **CDN / DNS:** Cloudflare (callysto.io)

---

## Local Dev Setup

*(Populate once scaffolded)*

```bash
# Clone
git clone https://github.com/Chris-Side-Projects/callysto-notebooks.git
cd callysto-notebooks

# Install
npm install

# Environment
cp .env.example .env.local
# Fill in values (see Environment Variables below)

# Database
# Run PostgreSQL locally or use Railway dev database
npm run db:migrate

# Dev server
npm run dev
# → http://localhost:3000
```

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Auth (NextAuth)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...

# GitHub OAuth
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# ORCID OAuth
ORCID_CLIENT_ID=...
ORCID_CLIENT_SECRET=...

# Cloudflare R2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=callysto-notebooks
R2_PUBLIC_URL=...
```

---

## Deployment

- **Production:** Railway (auto-deploy on push to `main`)
- **Domain:** callysto.io → Railway deployment via Cloudflare DNS
- **Database:** Railway PostgreSQL add-on

---

## Key Directories *(populate as scaffolded)*

```
app/              Next.js app router pages + API routes
components/       Shared React components
lib/              Utilities, DB client, auth config, R2 client
scripts/          Build-time scripts (nbconvert rendering, etc.)
migrations/       DB migrations (Drizzle or Prisma)
public/           Static assets
```

---

## Notebook Rendering Pipeline

1. User submits `.ipynb` file or GitHub URL
2. Raw `.ipynb` stored in R2 at `notebooks/{userId}/{notebookId}/raw.ipynb`
3. Python script runs `nbconvert --to html` on the raw file
4. Rendered HTML stored in R2 at `notebooks/{userId}/{notebookId}/rendered.html`
5. Metadata (title, cell count, kernel, etc.) extracted and written to PostgreSQL
6. Notebook detail page serves the rendered HTML from R2

---

## Important Notes for Coding Agents

- Read `INTENT.md` and `PLAN.md` before touching anything
- No new dependencies without flagging to Chris
- All commits: `edwardtheclaw / edward.the.claw@gmail.com`
- Never commit `.env.local` or any secrets
- Run `npm run build` before pushing to confirm no type errors
