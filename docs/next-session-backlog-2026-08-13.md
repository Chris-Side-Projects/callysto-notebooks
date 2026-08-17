# Next-Session Backlog (Prioritized)

## 1) Immediate next steps (do first)

1. Restore shell access in this environment and confirm repository state.
2. Verify branch and remote synchronization.
3. Re-open PR #2 and confirm only intended M0 handoff changes are included.
4. Run at least: `git status`, `git log -n 20`, `npm ci`, `npm run check`, `npm run test:next-sharp`.
5. Verify no stale public deployment claims remain in docs.

## 2) Known bugs / issues

1. No local shell process execution path in this environment for this turn (`/bin/sh` / `/bin/zsh` unavailable).
2. No remaining evidence for live Cloudflare Worker/R2 proof in this branch.
3. `M1` remains `NO-GO` by project policy until approved scope changes.
4. `T004` still marked `PARTIAL`; dependency hardening path remains.

## 3) Unfinished work

1. Reconcile all milestone/state docs against live repository output after shell restoration.
2. Execute and document Cloudflare credentials + deployed proof path.
3. Finalize the deployment strategy statement for whether hosted proof remains local-only or service-linked.
4. Refresh PR text and merge checklist once the final pass is complete.

## 4) Planned feature / milestone work

1. Keep focus on evidence-first milestones.
2. Expand platform-facing proof work only after M0 gates are closed.
3. Prepare explicit handoff gate for M1 start (scope, dependencies, acceptance criteria).

## 5) Technical debt

1. Replace temporary dependency overrides as upstream package versions become safe.
2. Centralize all pending/partial milestone state in one canonical handoff file.
3. Keep CI evidence artifacts in one consistent directory to avoid duplicated claims.

## 6) Open questions

1. What exact evidence format is required by the team for Cloudflare/hosting success?
2. Can we merge draft PR once `T004` and provider proof are complete, or should we preserve one more staged checkpoint?
3. What minimum deployment path qualifies as “production proof” for this project phase?
4. Should we introduce stricter docs ownership headers for each state file?

## 7) Ideas worth exploring later

1. Provider-agnostic deployment proof template for future external service dependencies.
2. A “handoff health” script that writes a machine-readable state snapshot into `docs/state/latest.json`.
3. Lightweight README state badge section linking to the canonical handoff and milestone tracker.
