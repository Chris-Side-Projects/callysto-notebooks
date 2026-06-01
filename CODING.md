# CODING.md - Master Coding Reference

*The single source of truth for coding practices, protocols, and lessons.*
*Read this before any coding task. Project-specific rules live in each repo's DEVELOPER_NOTES.md.*

---

## 1. Coding Checklist

*Auto-invoked for any task that changes code which gets executed (scripts, apps, configs affecting behavior, features, bug fixes). NOT needed for: git pull, moving files, editing markdown, apt update, reading/searching.*

### When is this "real coding work"?
If it runs as code or changes how something runs → use this checklist.
If it's housekeeping (file moves, doc edits, git ops) → skip.

### Before Touching Code
- [ ] Read project's `DEVELOPER_NOTES.md` / `CLAUDE.md` / `STATE.md`
- [ ] `git status` + `git log --oneline -5` to understand current state
- [ ] Read the files you're about to change (never edit blind)
- [ ] If touching >3 files or architectural change: write a plan first (see Section 5)
- [ ] If spawning a sub-agent: follow Section 6, select model per MODEL_ROUTING.md

### While Coding
- [ ] Match existing code patterns exactly (imports, naming, error handling)
- [ ] Handle errors explicitly (no silent catches, no `// TODO` error handling)
- [ ] Use project's established import patterns (check DEVELOPER_NOTES.md)
- [ ] No new dependencies without approval
- [ ] Commit atomically: one logical change per commit, `type(scope): description`

### After Coding
- [ ] Run tests/build (`npm run build`, `pytest`, etc.)
- [ ] Verify runtime behavior: curl endpoints, check pm2/service logs, render pages
- [ ] `git diff` before committing to review your own changes
- [ ] Read back modified files to confirm they look right
- [ ] **Run post-sub-agent review** (see `prompts/subagent-review-checklist.md`): check for missing imports, duplicate imports, hardcoded values, silent failures
- [ ] Report with verification level:
  - **(verified)** = I tested it myself
  - **(sub-agent reported)** = Relaying claim, haven't tested. NEVER acceptable for coding.
  - **(estimated)** = Judgment without hard data

### Git Config (always)
- Name: `Edward (Clawdbot)` / Email: `edward.the.claw@gmail.com`
- Never use Chris's personal email for commits

## 2. Core Coding Rules

*These rules apply to all coding work, whether done by me or a sub-agent.*

### Philosophy
- **Don't be clever, be correct.** Simple > elegant.
- **Match existing style exactly.** Indentation, naming, import patterns.
- **Handle errors explicitly.** No silent failures, no `// TODO` error handling.
- **Comments explain WHY, not WHAT.** If the code needs a WHAT comment, rewrite the code.
- **If unsure about a dependency or API, check docs first.** Don't guess.

### Common Mistakes to Avoid
- Extra closing braces (count your brackets)
- Scope confusion (`currentState` vs `state`, `this` vs module scope)
- Calling non-existent methods (verify the API exists first)
- Reassigning `const` (use `let` if you need to reassign)
- Silent failures (always log or throw on unexpected states)
- Over-engineering (no abstraction layers unless asked)
- Ignoring existing patterns (if the codebase uses callbacks, don't introduce promises without reason)
- Escaped quotes (`\"`) in JSX (use regular quotes)
- "Build succeeded" ≠ "it works" (test actual runtime behavior)

### Language-Specific

**JavaScript/TypeScript:**
- `const` by default, `let` only when needed
- `async/await` over `.then()` chains
- Check for `null`/`undefined` explicitly
- Bun projects: `bun build --no-bundle` for syntax validation

**Python:**
- Type hints on function signatures
- `pathlib` over `os.path`
- f-strings over `.format()` or `%`
- `if __name__ == "__main__":` guard on scripts

### Project-Specific Quick Reference
*(Full details in each repo's DEVELOPER_NOTES.md)*

| Project | Stack | Key Rules |
|---------|-------|-----------|
| xcap-terminal | Next.js 16, TS, Tailwind | `import yf from "@/lib/yf"` (v3 singleton). Never `import yahooFinance from "yahoo-finance2"`. SSR uses localhost:3004. |
| Noesis | Next.js + core engine | Core is FROZEN. Content apps only. Items are JSONL. |
| XCAP Quant | Python + FastAPI + React | Watch column mappings. Dedup deal_ids. Key: `excel_parser.py`, `ingestor.py` |
| RS-SDK Bots | Bun + TypeScript | NEVER touch learner bots. Owl bots in `bots/` only. Validate with `bun build --no-bundle`. |

### Output Expectations (for sub-agents)
1. What you changed (file list)
2. How to verify it works
3. Any concerns or follow-ups
4. Git status (committed or not, and why)

## 3. Bug Finding Protocol

*Paste into Claude Code from any repo root. Stack-agnostic.*

### Prompt Template

Find and fix bugs in this codebase. Work systematically:

1. Read the README, ROADMAP, and any STATE/TODO files to understand what this project does
2. Check package.json/requirements.txt for the stack and available test commands
3. Run the existing test suite (if any) and note failures
4. Audit every file for:
   - **Runtime errors:** null/undefined access, division by zero, infinite loops, off-by-one
   - **Data bugs:** SQL injection, unvalidated input, missing error handling on external calls, uncaught promise rejections
   - **Auth/security:** ownership bypass, missing auth checks on routes, session issues
   - **Edge cases:** empty arrays, missing fields, concurrent access, boundary values
   - **Import/dependency bugs:** wrong import paths, missing deps, version mismatches
   - **Type errors:** wrong types passed between functions, implicit any, unsafe casts
5. For each bug found:
   - Fix it in the code
   - Add or update a test that would have caught it
6. Run the test suite again after all fixes to confirm nothing is broken
7. Write a `BUGS_FIXED.md` in the repo root listing every bug: file, line, what was wrong, what you did

Prioritize bugs that would cause runtime crashes or data corruption over style issues. Do not refactor working code. Do not add features. Only fix actual bugs and add test coverage for them.

## 4. CI Stabilization Protocol

*Use when getting a codebase green: tests, lint, typecheck, build, CI.*
*Replace `{{PROJECT_PATH}}` and `{{BRANCH_NAME}}` before use as a sub-agent prompt.*

### Prompt Template

You are working on a project at `{{PROJECT_PATH}}`. Review the codebase to understand the tech stack, tooling, and project structure before proceeding.

Your task: Make the codebase stable and CI-ready. Specifically:

**1. Get all tests passing**
- Identify the test runner and config (check package.json scripts, config files like vitest.config.*, jest.config.*, etc.)
- Run the test command and fix any failures
- If tests rely on native bindings or compiled dependencies, rebuild them as needed
- Note the expected test state (number of files/tests) if documented; otherwise establish a baseline

**2. Get lint passing**
- Run the lint command and fix all errors
- Do NOT disable rules or add ignore comments. Fix the actual issues.

**3. Get typecheck passing (if applicable)**
- Run the typecheck command (e.g. `tsc --noEmit`) and fix all type errors
- Respect path aliases and compiler options defined in tsconfig.json

**4. Get the build passing**
- Run the build command and fix any build errors
- Distinguish between code issues and environment/network issues (e.g. font fetches, CDN calls in sandboxed environments). Ignore the latter; fix the former.

**5. Verify CI workflow**
- Review CI config (`.github/workflows/`, `.gitlab-ci.yml`, Jenkinsfile, etc.) and ensure it would pass given the above fixes
- Understand the CI pipeline order and any special install steps (e.g. `--ignore-scripts`, selective rebuilds)

**6. Fix any issues you find along the way**
- If tests reveal bugs in app code, fix the app code
- If there are import errors, missing exports, or type mismatches between test and app code, fix them
- If test assertions don't match actual behavior (error messages, status codes, field names), update whichever side is incorrect — use your judgment

**Constraints:**
- Do NOT add new features
- Do NOT refactor working code for style
- Do NOT add new dependencies
- Commit each logical fix separately with a clear message
- Push all commits to branch `{{BRANCH_NAME}}`
- Run the full check suite at the end to confirm everything passes

## 5. Long-Run Autonomous Protocol

*Use for hours-long autonomous coding runs. Optimized for resumability after interruptions, compaction, or restarts.*
*This is a PLAN MODE prompt: output only a plan, then get approval before executing.*

### Prompt Template

You are operating in PLAN MODE ONLY.

**Objective:** Suggest improvements to this project and create a detailed execution plan.

**Non-negotiable workflow requirements — your plan must be engineered for:**
1. Long-running work (hours) without losing place
2. Atomic tasks (small, independently finishable)
3. Todo-driven execution where each atomic unit becomes a single todo item with clear acceptance criteria, gets checked off when complete, and ends with a commit
4. Constant documentation + state capture so work can resume after server restarts, context compaction, tool errors, or partial completion

**Required plan structure (output exactly these sections, in this order):**

#### 1) Project Understanding Snapshot
- What the project appears to be (from repo inspection)
- Key components (folders/modules/services)
- How it is built/run/tested/deployed
- Current risks/unknowns that must be validated early

#### 2) Resumability System
Design a lightweight but robust system for continuity:

- **PROGRESS.md** — Single source of truth containing: current milestone, active branch, last completed todo + commit hash, next 3 todos queued, known issues/blockers, commands to reproduce current state
- **TODO.md** — Atomic items only, with IDs (T001, T002...), status (todo/doing/done), links to commits
- **DECISIONS.md** — ADR-lite capturing decisions + rationale
- **NOTES.md or RUNBOOK.md** — Operational steps
- **Restart protocol** — Exact steps to rehydrate context and continue after interruption

#### 3) Work Policy
Explicit rules to follow during execution:
- One atomic change per commit
- Branching strategy (main/dev/feature branches)
- Commit message convention (include todo ID)
- When to refactor vs when to defer
- How to avoid scope creep
- How to handle uncertainty: spike tasks with timeboxes
- How to log discoveries continuously (what goes where)
- How to stop safely: always end at a clean checkpoint with state updated

#### 4) Audit Plan
Exact order of inspection and why:
1. Repo structure scan
2. Dependency/build system
3. Runtime entrypoints
4. Tests
5. CI/CD
6. Configuration/secrets handling
7. Logging/observability
8. Error handling/retries
9. Performance bottlenecks
10. Security posture
11. Documentation gaps

Include explicit commands to run and what outputs to capture into docs.

#### 5) Improvement Backlog
Large backlog split into categories:
- Reliability & Resilience
- Agent/task orchestration (if applicable)
- Observability (logs/metrics/traces)
- Performance & cost
- Security & secrets hygiene
- Code quality & architecture
- DevEx (tooling, scripts, CI)
- Documentation & onboarding

For each backlog item provide:
- ID (T###)
- Goal (1 sentence)
- Why it matters (1-2 sentences)
- Scope (what is in/out)
- Acceptance criteria (bullet list)
- Estimated complexity (S/M/L)
- Dependencies (other T### items)
- Resulting commit name template

**Important:** Every item must be atomic (finishable in 30-120 minutes). If too big, split it.

#### 6) Milestones + Execution Sequence
Group backlog into milestones (M1, M2, ...) such that:
- M1 creates fast confidence and stabilizes the workflow (docs, tests, run commands, baseline)
- Later milestones build on earlier ones
- Each milestone lists exact todo IDs included

#### 7) Checkpoint Rhythm
Define a rhythm for safe hour-long operation:
- When to update PROGRESS.md (minimum: after every commit)
- When to update TODO.md statuses
- When to update DECISIONS.md
- When to run tests/validations
- When to create recovery checkpoints (e.g., every N commits)

#### 8) Questions / Unknowns
List only truly blocking questions. For everything else: make a reasonable assumption and create a todo item to validate it early.

**Constraints:**
- Do not execute changes now. Output only the plan.
- Avoid large "umbrella tasks." Split aggressively.
- Prefer safe, reversible steps first.
- Assume the plan may be resumed mid-stream by another model with limited context, so documentation must be explicit.

**Finish with:** A short "Approval Checklist" stating what should be verified before proceeding.

## 6. Sub-Agent Spawn Protocol

*Before spawning any coding sub-agent, run through this.*

### Is This Sub-Agent Worthy?
- Is the task parallelizable/mechanical? (If it needs judgment → do it myself)
- Can the output be verified objectively?
- Is failure recoverable?

### Model Selection (see MODEL_ROUTING.md for full details)
- `flash` — Bulk/cheap tasks, summaries
- `grok` / `grok-code` — Long documents (2M context), coding
- `opus46` — ONLY for financials/critical reasoning
- `sonar` — Web research
- `thomas` — Step-by-step logic

### Prompt Requirements (include in every sub-agent prompt)
1. **"Read DEVELOPER_NOTES.md first"** — Always point to the project's convention file
2. **Explicit output format** — File path, JSON structure, what "done" looks like
3. **MAY/MUST NOT constraints** — What files they can touch, what's off limits
4. **Max scope** — "Max files to modify: N"
5. **Known failure modes** — Include the relevant ones from Section 7
6. **Verification step** — "Confirm by running X"
7. **Failure mode instruction** — "If build fails, fix and rebuild. Do not report success if build fails."

### Never Include in Sub-Agent Prompts
- `openclaw system event` (causes infinite delivery loops)
- Assumptions about package versions (specify explicitly)
- Vague success criteria ("make it better")

### Post-Spawn Verification (MANDATORY)
1. Check if output file was actually written
2. Run build/tests
3. `curl` API endpoints if applicable
4. Check pm2/service logs for errors
5. **Do NOT tell Chris "it's done" until YOU have verified**

### Patching Priority (when sub-agent output is broken)
Fix in this order — don't jump to rewriting prompts:
1. **Tools first** — Wrong import? Fix the import.
2. **State/context** — Missing DEVELOPER_NOTES? Add it.
3. **Routing/policy** — Wrong model for the task? Switch model.
4. **Prompt last** — Only rewrite the prompt after 1-3 are ruled out.

## 7. Known Failure Modes

*Hard-won lessons. Include relevant ones in every sub-agent prompt.*

| Archetype | Count | What Happens | Prevention |
|-----------|-------|-------------|------------|
| **wrong-import** | 3 | Sub-agent uses wrong package import (e.g., yahoo-finance2 v2 instead of v3) | Always include exact import pattern in prompt. Point to DEVELOPER_NOTES.md. |
| **escaped-quotes** | 2 | Grok generates `\"` instead of `"` in JSX | Add to prompt: "In JSX, use regular quotes, not escaped quotes." Avoid Grok for JSX-heavy work (use sonnet-or). |
| **false-success** | 5 | Sub-agent reports "done" but code is broken at runtime | ALWAYS verify: curl endpoints, check logs, render pages. Never relay "it works" without testing. |
| **system-event-loop** | 3 | `openclaw system event` in prompt causes 50+ duplicate deliveries | NEVER include `openclaw system event` in sub-agent prompts. Use sessions_list to check status. |

### Other Patterns
- **Scope creep** — Vague success criteria leads to agents adding unrequested features. Use contract-style MAY/MUST NOT.
- **Cloudflare Access blocking SSR** — Server-side fetches must use localhost, not the public URL behind Cloudflare Access.
- **Context degradation** — Long sessions lose quality. Use state files (PROGRESS.md) to survive resets.
- **Flash crashes on long synthesis** — Use split pattern: Flash gathers data, Sonnet synthesizes.
- **Learner bot edits** — FlashBot1/EmergerCrab2 are pipeline-only. NEVER edit directly.

## 8. Prompt Engineering Principles

*Distilled from research/agentic-coding-tutorial.md. The full tutorial remains as deep reference.*

### Universal Framework (4 Elements)
1. **Role** — "Senior TypeScript architect with 15y exp"
2. **Goal + Success Criteria** — What "done" looks like, verifiable
3. **Context** — Files, docs, constraints, why this matters
4. **Output Format + Verification** — JSON/XML, checklist before responding

### Claude-Specific
- Use XML tags: `<instructions>`, `<context>`, `<example>`, `<output_format>`
- Contract-style system prompts work best
- 4-block user prompts: INSTRUCTIONS / CONTEXT / TASK / OUTPUT FORMAT
- "Read files before editing" and "Write tests first" as explicit instructions
- For long-horizon work: instruct state saving to files/Git

### Multi-Model Chains (Daisy-Chaining)
When a task benefits from different model strengths:
1. **Planner** (Opus/o1): Spec, architecture, task breakdown, tests
2. **Coder** (Sonnet/GPT): Implement exactly per plan, TDD
3. **Reviewer** (different model): Bugs, security, style, performance
4. **Fixer** (back to Coder): Iterate until reviewer approves

Cost: roughly same as Opus-for-everything, but 40-60% fewer errors.

### Ralph Loops (Persistent Iteration)
For large features that need multiple iterations:
- Feed same prompt + accumulated state until completion signal
- Circuit breaker: max 30-50 iterations
- Use cheaper models (Sonnet) for the loop
- Explicit completion criteria: `<RALPH_STATUS>COMPLETE</RALPH_STATUS>`
- **Key insight: persistence beats intelligence**

### Pro Tips
- Few-shot examples beat adjectives
- "Explain your reasoning, then act"
- Self-critique: "Before final output, verify against criteria"
- Iterate prompts: run, fail, add guardrail ("No placeholders!")
- Prompt caching saves up to 90% on repeated prompts (Anthropic: 10x cheaper reads; OpenAI: 50% cheaper, automatic)

---

*Full research reference: `/root/clawd/research/agentic-coding-tutorial.md`*
*Architecture analysis: `/root/clawd/research/agent-architecture/`*
*Sub-agent outcome data: `/root/clawd/memory/subagent-outcomes.json`*
