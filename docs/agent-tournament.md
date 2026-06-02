# Agent Tournament Results

*Task: Notebook Vote Button (Task 1)*
*Run: 2026-06-02 ~02:10–02:34 UTC*

---

## What Was Tested

Four AI agents (Claude, Codex, Gemini, Grok) competed on the same task: implement upvoting for notebooks with optimistic UI.

Each agent produced a **plan**, then a **build**, then the builds were **QA reviewed** by all agents (majority vote).

Two variants ran back-to-back:
- **Baseline**: Codex=default (GPT-4o), Gemini=default (Gemini 2.5 Pro)
- **Upgraded**: Codex=gpt-5.5, Gemini=gemini-2.5-flash

---

## Results

### Baseline Tournament

| Stage | Winner | Vote |
|-------|--------|------|
| Plan | **Claude** | 3–0 unanimous |
| Build | **Claude** | 2–1–1 (claude/gemini/tie) |
| QA Verdict | **PASS** | Claude's build passed QA |

**QA findings on Claude's build (PASS):**
- TypeScript types correct, `useOptimistic` + `useTransition` idiomatic
- Minor: `catch {}` swallows errors (no `console.error`)
- Minor: mock notebook IDs vs. real DB — count snaps to 0 if notebook not in DB
- Minor: double screen-reader announcement (aria-label + aria-live)
- Acknowledged: no `revalidatePath` (deliberate pre-auth tradeoff)

### Upgraded Tournament

| Stage | Winner | Vote |
|-------|--------|------|
| Plan | **Codex (gpt-5.5)** | Voted best |
| Build | **Claude** | 3–1 (claude wins) |
| QA Verdict | **FAIL** | Claude's upgraded build failed QA |

**QA findings on Claude's upgraded build (FAIL):**
1. **Critical**: `mockNotebooks` on page vs. real DB in action — UUID mismatch, every click throws "Notebook not found"
2. **Critical**: `PLACEHOLDER_USER_ID` has no matching row in `users` — FK violation on any vote insert
3. **Critical**: `userId` accepted as client-supplied action arg — vote-spoofing security hole (must come from server session)
4. Medium: No `revalidatePath` — stale count on hard refresh
5. Minor: Double aria announcement

---

## Key Takeaways

1. **Claude wins build in both variants** — consistently produces the most deployable code, even when Codex wins planning.
2. **Codex gpt-5.5 improves planning** — beat Claude on planning in the upgraded round, even though Claude still built better.
3. **Upgraded round revealed wiring regressions** — Claude's upgraded build had more critical issues than baseline (mock vs. DB mismatch introduced, userId security hole). This suggests the upgraded Codex plan was longer/more detailed but Claude's build didn't fully follow it.
4. **Common failure pattern**: Test/mock data vs. real DB wiring. Needs to be explicitly called out in task specs or DEVELOPER_NOTES.

---

## Recommended Agent Pipeline

Based on tournament results, for Callysto coding tasks:

| Role | Agent | Rationale |
|------|-------|-----------|
| **Planning** | Codex (gpt-5.5) or Claude | Both competitive; Codex edge in upgraded models |
| **Building** | Claude | Wins build in both tournaments |
| **QA/Check** | Multi-agent panel | Majority vote catches more edge cases |

**Practical recommendation:** Use Claude for building. For critical features, have Codex review the plan first.

---

## Files

All raw results in `/root/projects/callysto-tournament/results/`:
- `baseline/` — plans, builds, reviews, check reports per agent
- `upgraded/` — same, with upgraded model variants
