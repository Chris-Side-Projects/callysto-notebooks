# Dependency risk register

- Status: **MILESTONE 0 ACTIVE**
- Last reviewed: 2026-07-20
- Owner: project owner until a security owner is named in T010

## Install-script policy

`strict-allow-scripts=true` and the root `allowScripts` map deny lifecycle scripts from
`esbuild`, `fsevents`, `sharp`, and `unrs-resolver`. Locked prebuilt packages are used instead.
An unreviewed lifecycle script makes `npm ci` fail. The policy is verified locally on macOS arm64 and
in the successful Ubuntu baseline [workflow run 29780426457](https://github.com/Chris-Side-Projects/callysto-notebooks/actions/runs/29780426457). Hosted execution of this proof branch's expanded workflow remains pending until a pull
request is opened; feature-branch pushes do not trigger this workflow.

On 2026-07-20 a disposable clean install added 443 packages, executed no dependency lifecycle
script, and reported no unreviewed scripts pending. The dependency tree and production build then
passed on the exact Node/npm runtime.

The direct `esbuild@0.28.1` development pin satisfies Vite's optional peer contract and prevents
npm from incorrectly deduplicating Drizzle Kit's older `esbuild@0.25.12` into that slot.

## Accepted development-only advisory

`drizzle-kit@0.31.10` retains four moderate findings through its deprecated
`@esbuild-kit/esm-loader` dependency and an older esbuild development-server advisory.

Audit evidence on 2026-07-20: the production tree reported zero vulnerabilities; the full tree
reported exactly these four moderate findings and exited successfully at the configured `high`
threshold.

- Scope: local and CI schema tooling only; never part of the production dependency tree.
- Mitigations: Drizzle Studio and esbuild development servers must never be exposed; production
  audit blocks moderate or higher; full-tree audit blocks high or critical and still reports the
  exception.
- Expiry: 2026-09-30, or earlier when a stable Drizzle Kit release removes the legacy loader.
- Closure evidence: update the exact pin, regenerate the lockfile, and record clean production and
  full-tree audit output.

Do not use `npm audit fix --force`; dependency changes require an explicit exact-version review.
