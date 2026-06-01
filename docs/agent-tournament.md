# Agent Tournament Results

*Last updated: 2026-06-01*

Two back-to-back tournaments on the same task (Task 1: notebook vote button), run overnight. Each tournament had three phases: Plan, Build, and Check. Each phase was scored by all four agents; majority vote picked the winner.

---

## Task

Implement a working vote button for notebook pages. Requirements: server action with race-safe increment, optimistic UI with `useOptimistic` + `useTransition`, `aria-pressed` / `aria-live` accessibility, TypeScript strict-clean, no features beyond scope.

---

## Agents

| Agent | Baseline model | Upgraded model |
|-------|---------------|----------------|
| Claude Code | `claude-opus-4-7` | same (already flagship) |
| Codex CLI | `gpt-5` (base) | `gpt-5.5` |
| Grok Build | `grok-build` | same |
| Gemini CLI | `gemini-2.0-pro-exp-02-05` | `gemini-2.5-flash` |

---

## Baseline Tournament

### Plan phase

| Reviewer | Winner |
|----------|--------|
| Claude | claude |
| Codex | claude |
| Grok | *(corrupted output — terminal echo)* |
| Gemini | *(answered as if task already done — invalid)* |

**Plan winner: Claude** (3/4 votes; Grok and Gemini outputs were disqualified)

Scores by reviewer (Claude's card):
- Correctness: 9 — Correct on `useOptimistic`, `onConflictDoNothing`, SQL-side increment, READ COMMITTED
- Completeness: 9 — Full wiring: action, component, page, types, a11y, verification
- Risk awareness: 10 — Best in class: FK on placeholder, mock UUIDs not in DB, stale `initialVoteCount`, session-scoped `hasVoted`, CSRF notes
- Clarity: 9 — Delta-oriented, well-sectioned

### Build phase

Only Claude produced working code. Codex submitted empty. Grok echoed the task prompt. Gemini narrated a plan and then deferred to Claude's existing files.

**Build winner: Claude** (2 votes Claude, 1 Gemini, 1 ambiguous)

Claude's build scores (from Codex's review card):
- Correctness: 10 — transaction-safe, race-safe insert+increment, returns truthful count
- TypeScript quality: 10 — explicit `VoteState` alias, no `any`
- React patterns: 10 — textbook `useOptimistic` + `useTransition` + base-state pattern
- Error handling: 9 — try/catch reverts via committed-state split, error surfaced with `role="alert"`
- Clarity: 10 — tight, purposeful comments only

**Baseline totals:** Claude 45/50 · Gemini 14/50 · Codex 5/50 · Grok 5/50

---

## Upgraded Tournament

Codex switched to `gpt-5.5`. Gemini switched to `gemini-2.5-flash`.

### Plan phase

| Reviewer | Winner |
|----------|--------|
| Claude | claude |
| Codex | codex |
| Grok | *(truncated terminal output — unusable)* |
| Gemini | *(exploration log, not a plan — disqualified)* |

**Plan winner: Codex** (2 votes; Claude and Codex split, Grok/Gemini disqualified)

Upgraded Codex plan was stronger: explicitly checked notebook existence before the generic `votes.targetId` insert, added `initialHasVoted` support, handled duplicate votes, preserved atomic increments, and flagged the mock-data vs real-DB mismatch. Tighter on correctness and completeness than baseline.

Claude's upgraded plan scores (Claude reviewer): Correctness 9, Completeness 9, Risk 10, Clarity 9 — essentially unchanged from baseline, strong throughout.

### Build phase

Claude again the only agent that shipped code. Codex still empty. Grok still echoed prompt. Gemini added one line to Claude's existing file.

**Build winner: Claude** (3 votes)

Upgraded Claude build scores (Claude's review card):
- Correctness: 9 — transaction + existence-check + atomic increment + canonical count return
- TypeScript quality: 9 — zero `any`, all explicit generics
- React patterns: 9 — idiomatic `useOptimistic` + `useTransition`; committed state handles failure path
- Error handling: 9 — `role="alert"`, automatic revert via optimistic/committed split
- Code clarity: 9 — tight, no dead code, commented at non-obvious bits only

---

## Summary

| Phase | Baseline winner | Upgraded winner |
|-------|----------------|-----------------|
| Plan | Claude | Codex (gpt-5.5) |
| Build | Claude | Claude |
| Check | Claude | Claude |

**Across both tournaments:** Claude wins every phase except Plan in the upgraded run, where Codex (gpt-5.5) edged it out on plan rigor.

Grok was unusable in both runs — output consistently truncated to a terminal echo of the task prompt. Gemini produced no independent plans or builds in either run; it narrated and deferred.

---

## Findings

### What the upgrade changed

- **Codex `gpt-5` → `gpt-5.5`:** Meaningful plan improvement. Baseline Codex was scope-creeping and uncertain; upgraded Codex was focused, caught the FK gap, and won the plan vote. Still produced no code in the build phase (likely a CLI timeout/context issue, not a model capability issue).
- **Gemini `2.0-pro-exp` → `2.5-flash`:** No measurable improvement for this task type. Still produced exploration logs instead of plans, still no build output.

### Recommended pipeline roles (data-backed)

| Role | Recommended agent | Rationale |
|------|------------------|-----------|
| Plan / architecture | Claude or Codex (gpt-5.5) | Both produce correct, risk-aware plans. Codex can outperform on completeness when task is well-specified. |
| Code generation (write tools) | Claude | Only agent that reliably ships working code in both runs. |
| Code review | Claude | Most consistent and calibrated reviewer across both tournaments. |
| Sanity check / second opinion | Codex (gpt-5.5) | Good as a second reviewer on plans; flags different risks than Claude. |
| Broad research / planning | Gemini | Not suited for implementation tasks based on these results. |
| Grok Build | — | Unusable for this task format. May need different invocation (not shell-based). |

### Open questions

1. Codex produced empty build output in both runs. Is this a CLI timeout, context window, or write-tools configuration issue? Worth a dedicated investigation before writing it off.
2. Grok's terminal-echo failures suggest the invocation method (shell script calling `grok build`) may not be the right interface. Worth testing Grok natively.
3. Gemini's plan outputs were "exploration logs" rather than structured plans. May perform differently with a stricter prompt template.

---

*Raw results: `/root/projects/callysto-tournament/results/`*
*Tournament script: `/root/projects/callysto-tournament/run-tournament.sh`*
