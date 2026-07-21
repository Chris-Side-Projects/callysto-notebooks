# VPS credential handoff without disclosure

- Status: **ACTIVE OPERATING PROCEDURE**
- Last verified: 2026-07-21
- Scope: Callysto staging credentials only; never use this procedure to widen a shared credential

The personal Codex skill `use-vps-secrets-safely` is installed at
`~/.codex/skills/use-vps-secrets-safely/`. It requires credentials to remain on the VPS and permits
only allowlisted, non-secret results to leave the remote process. This document records the
project-specific handoff; it contains no credential value, provider account ID, or shared-server
secret path.

## Exact paste point

Use these stages in order. **Never paste the stages together.** Pasting a secret-reading command in
the same terminal paste as later shell lines can make `read` consume a buffered command as the
credential and leave the real token at a shell prompt.

### 1. Enter the VPS and root shell

At the local terminal, run this line by itself, replacing only the bracketed VPS alias. Wait until
the remote shell prompt is visible:

```bash
ssh -t <validated-vps-alias>
```

At that remote prompt, run this line by itself. Wait until the root Bash prompt is visible:

```bash
sudo /bin/bash --noprofile --norc
```

### 2. Define the fail-closed installer

Paste the complete block below at the root Bash prompt. This stage only defines a function; it does
not ask for or read a token. Wait until the root prompt returns before continuing:

```bash
callysto_install_cloudflare_token() (
  set -euo pipefail
  umask 077

  export PATH=/usr/sbin:/usr/bin:/sbin:/bin
  readonly PATH
  export LC_ALL=C

  readonly CALLYSTO_CF_DIR=/etc/callysto
  readonly CALLYSTO_CF_TARGET=/etc/callysto/cloudflare-api-token
  CALLYSTO_CF_TMP=""
  CALLYSTO_CF_TOKEN=""

  cleanup_callysto_cf() {
    unset CALLYSTO_CF_TOKEN
    if [[ -n "${CALLYSTO_CF_TMP:-}" ]] &&
       [[ -e "$CALLYSTO_CF_TMP" || -L "$CALLYSTO_CF_TMP" ]]; then
      command rm -f -- "$CALLYSTO_CF_TMP" || true
    fi
  }

  trap cleanup_callysto_cf EXIT
  trap 'exit 129' HUP
  trap 'exit 130' INT
  trap 'exit 143' TERM

  if (( EUID != 0 )); then
    command printf '%s\n' 'Root shell required; nothing was installed.' >&2
    exit 1
  fi

  if [[ -L "$CALLYSTO_CF_DIR" ||
        ( -e "$CALLYSTO_CF_DIR" && ! -d "$CALLYSTO_CF_DIR" ) ]]; then
    command printf '%s\n' 'Credential parent is not a safe directory.' >&2
    exit 1
  fi
  if [[ ! -e "$CALLYSTO_CF_DIR" ]]; then
    command install -d -o root -g root -m 0700 -- "$CALLYSTO_CF_DIR"
  fi
  if [[ -L "$CALLYSTO_CF_DIR" ||
        ! -d "$CALLYSTO_CF_DIR" ||
        "$(command stat -c '%u:%g:%a' -- "$CALLYSTO_CF_DIR")" != '0:0:700' ]]; then
    command printf '%s\n' 'Credential parent must be root-owned mode 0700.' >&2
    exit 1
  fi

  if [[ -L "$CALLYSTO_CF_TARGET" ||
        ( -e "$CALLYSTO_CF_TARGET" && ! -f "$CALLYSTO_CF_TARGET" ) ]]; then
    command printf '%s\n' 'Credential target is not a safe regular file.' >&2
    exit 1
  fi
  if [[ -e "$CALLYSTO_CF_TARGET" &&
        "$(command stat -c '%u:%g:%a:%h' -- "$CALLYSTO_CF_TARGET")" != '0:0:600:1' ]]; then
    command printf '%s\n' 'Existing credential target has unsafe metadata.' >&2
    exit 1
  fi

  CALLYSTO_CF_TMP="$(command mktemp -p "$CALLYSTO_CF_DIR" '.cloudflare-api-token.tmp.XXXXXXXXXX')"
  if [[ -L "$CALLYSTO_CF_TMP" ||
        ! -f "$CALLYSTO_CF_TMP" ||
        "$(command stat -c '%u:%g:%a:%h' -- "$CALLYSTO_CF_TMP")" != '0:0:600:1' ]]; then
    command printf '%s\n' 'Temporary credential file failed initial validation.' >&2
    exit 1
  fi

  if ! IFS= read -r -s -p 'Callysto Cloudflare token: ' CALLYSTO_CF_TOKEN; then
    command printf '\n%s\n' 'Credential input failed; nothing was installed.' >&2
    exit 1
  fi
  command printf '\n' >&2
  if [[ -z "$CALLYSTO_CF_TOKEN" ]]; then
    command printf '%s\n' 'Credential was empty; nothing was installed.' >&2
    exit 1
  fi
  if ! command printf '%s' "$CALLYSTO_CF_TOKEN" >| "$CALLYSTO_CF_TMP"; then
    command printf '%s\n' 'Credential write failed; nothing was installed.' >&2
    exit 1
  fi
  unset CALLYSTO_CF_TOKEN
  command chown root:root -- "$CALLYSTO_CF_TMP"
  command chmod 0600 -- "$CALLYSTO_CF_TMP"
  if [[ -L "$CALLYSTO_CF_TMP" ||
        ! -f "$CALLYSTO_CF_TMP" ||
        ! -s "$CALLYSTO_CF_TMP" ||
        "$(command stat -c '%u:%g:%a:%h' -- "$CALLYSTO_CF_TMP")" != '0:0:600:1' ]]; then
    command printf '%s\n' 'Temporary credential file failed validation.' >&2
    exit 1
  fi

  command mv -fT -- "$CALLYSTO_CF_TMP" "$CALLYSTO_CF_TARGET"
  CALLYSTO_CF_TMP=""

  if [[ -L "$CALLYSTO_CF_TARGET" ||
        ! -f "$CALLYSTO_CF_TARGET" ||
        ! -s "$CALLYSTO_CF_TARGET" ||
        "$(command stat -c '%u:%g:%a:%h' -- "$CALLYSTO_CF_TARGET")" != '0:0:600:1' ]]; then
    command printf '%s\n' 'Credential postcondition failed.' >&2
    exit 1
  fi

  command printf '%s\n' 'Credential stored with verified root-only metadata.' >&2
)
```

### 3. Invoke, then paste the token

After the function-definition paste has finished and the root prompt has returned, run this line
**by itself** and press Return:

```bash
callysto_install_cloudflare_token
```

Paste the token **only after the terminal displays `Callysto Cloudflare token:`**. The cursor will
not show characters while the token is pasted. Press Return once. Do not paste the token into this
document or the function text, and do not replace `$CALLYSTO_CF_TOKEN` with the value. Because the
invocation line is sent separately and contains no following commands, the hidden `read` begins
with no buffered script lines waiting behind it.

## Token to create

Create a new custom Callysto **provisioning** token in the intended Cloudflare account. For the
current `workers.dev`/R2 proof, scope it to that account only and grant only:

- Account / Workers Scripts / Edit;
- Account / Workers R2 Storage / Edit; and
- Account / Account Settings / Read, when the deployment client requires account discovery.

Set the shortest practical expiry and, if the operator's stable address permits it, a client-IP
restriction. Do not grant API Tokens Edit, Cloudflare Tunnel, billing, user, all-account, DNS, or
zone permissions for this proof. A later custom-hostname decision requires a separate review before
adding zone-scoped Workers Routes or DNS authority. Cloudflare's current permission names and token
creation flow are documented in [API token permissions](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)
and [Create API token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/).

This provisioning token is not an application runtime credential. After the proof buckets exist,
create separately scoped primary and recovery R2 identities under the design in
[`docs/evidence/M0-staging-topology.md`](./evidence/M0-staging-topology.md); do not reuse the
provisioner or one identity across both stores. Cloudflare's account-level R2 write permission can
create/delete/list buckets and read/write/list their objects, so it belongs only in the controlled
provisioning path, never in the Worker or converter.

Use the same hidden-prompt pattern with different variable names and different root-owned `0600`
files for each primary and recovery R2 value. Primary and recovery credentials must be separate
provider identities; changing only the filename does not create separation.

## Required preflight

Before use, an operator must validate without reading a value:

- the complete selected secret path is not a symlink;
- `/etc/callysto` is root-owned and mode `0700`;
- every credential file is root-owned, regular, non-empty, and mode `0600`;
- the credential label, provider account, environment, resources, operations, lifetime, and
  revocation owner match the exact Callysto staging action; and
- no existing shared token is silently promoted from inventory access to deployment authority.

The previously inventoried shared VPS Cloudflare bundle does not pass this Callysto handoff: its
directory boundary is not accepted by the skill, it is not purpose-specific, and its verified API
scope cannot create or enumerate account tokens. A Cloudflared tunnel connector token is a separate
credential and must never be substituted.

## In-place use contract

A same-process remote program may read one validated file, call one exact provider endpoint, parse
the response in memory, and emit only a fixed schema such as booleans, counts, and provider error
codes. It must not print raw response bodies, credentials, hashes/fingerprints of credentials,
account inventory, signed URLs, or object contents. If a CLI is unavoidable, provide the secret only
in the child environment through `execve`, never in arguments or a shell fragment.

After every operation, verify no credential was copied to the workstation, shell history,
clipboard, repository, `.env*`, command argument, debug log, CI artifact, or chat. Inspect `git
status`, staged paths, and the relevant remote process list; report only the action, result, and
evidence boundary.
