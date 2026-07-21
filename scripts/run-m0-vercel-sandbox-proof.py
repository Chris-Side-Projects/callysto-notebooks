#!/usr/bin/env python3
"""Run an M0 Vercel Sandbox proof without exposing the local CLI token.

This launcher reads the existing Vercel CLI credential only after verifying its
owner/mode boundary. It resolves or creates one exact project through the API,
then replaces itself with the Node proof process and passes the token only in
that process environment. It never prints API bodies, token values, team IDs,
or project IDs.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import resource
import ssl
import stat
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, NoReturn


EXPECTED_NODE_VERSION = "v24.18.0"
EXPECTED_NODE_PATH = Path(
    "/private/tmp/callysto-runtime-v24.18.0-py3.14.6/node/bin/node"
)
EXPECTED_NODE_SHA256 = (
    "ee6fb0e015284d83a91e8ec5213f43a157f8a392b58555301682892ba928c04a"
)
EXPECTED_NODE_ARCHIVE_PATH = Path(
    "/private/tmp/callysto-runtime-v24.18.0-py3.14.6/downloads/"
    "node-v24.18.0-darwin-arm64.tar.gz"
)
EXPECTED_NODE_ARCHIVE_SHA256 = (
    "e1a97e14c99c803e96c7339403282ea05a499c32f8d83defe9ef5ec66f979ed1"
)
EXPECTED_PROJECT_NAME = "callysto-m0-proof"
EXPECTED_PROJECT_EXCLUSIVITY_MARKER = "callysto-m0-proof-exclusive-v1"
TEAM_SLUG_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$")
ID_PATTERN = re.compile(r"^(?:prj|team)_[A-Za-z0-9]+$")
VERCEL_API_ORIGIN = "https://api.vercel.com"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # type: ignore[no-untyped-def]
        del req, fp, code, msg, headers, newurl
        return None


def _platform_ca_locations() -> tuple[str | None, str | None]:
    """Use OpenSSL's compiled trust paths, not ambient override variables."""

    paths = ssl.get_default_verify_paths()
    cafile = (
        paths.openssl_cafile
        if paths.openssl_cafile and Path(paths.openssl_cafile).is_file()
        else None
    )
    capath = (
        paths.openssl_capath
        if paths.openssl_capath and Path(paths.openssl_capath).is_dir()
        else None
    )
    if cafile is None and capath is None:
        raise RuntimeError("platform CA store unavailable")
    return cafile, capath


TLS_CA_FILE, TLS_CA_PATH = _platform_ca_locations()
TLS_CONTEXT = ssl.create_default_context(cafile=TLS_CA_FILE, capath=TLS_CA_PATH)


def _url_opener() -> urllib.request.OpenerDirector:
    """Build an exact-origin client that never inherits ambient proxy settings."""

    return urllib.request.build_opener(
        urllib.request.ProxyHandler({}),
        urllib.request.HTTPSHandler(context=TLS_CONTEXT),
        NoRedirect(),
    )


URL_OPENER = _url_opener()


class LauncherError(RuntimeError):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


class SafeArgumentParser(argparse.ArgumentParser):
    def error(self, message: str) -> NoReturn:
        del message
        raise LauncherError("ARGUMENT_INVALID")


def _parser() -> SafeArgumentParser:
    parser = SafeArgumentParser()
    parser.add_argument("mode", choices=("converter", "orchestrator", "reconcile"))
    parser.add_argument("--accept-metered-proof", action="store_true")
    parser.add_argument("--create-project", action="store_true")
    parser.add_argument("--project-name", required=True)
    parser.add_argument("--team-slug", required=True)
    return parser


def _safe_error(code: str, stage: str) -> None:
    document = {
        "error_code": code,
        "schema_version": "callysto.vercel-sandbox-launcher.v0",
        "stage": stage,
        "status": "error",
    }
    sys.stdout.write(json.dumps(document, separators=(",", ":"), sort_keys=True) + "\n")


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    try:
        with path.open("rb") as source:
            while chunk := source.read(1024 * 1024):
                digest.update(chunk)
    except OSError as error:
        raise LauncherError("PINNED_NODE_INVALID") from error
    return digest.hexdigest()


def _validate_runtime_path(path: Path, *, directory: bool) -> os.stat_result:
    try:
        path_stat = path.lstat()
    except OSError as error:
        raise LauncherError("PINNED_NODE_INVALID") from error
    expected_type = stat.S_ISDIR if directory else stat.S_ISREG
    if (
        stat.S_ISLNK(path_stat.st_mode)
        or not expected_type(path_stat.st_mode)
        or path_stat.st_uid != os.getuid()
        or path_stat.st_mode & (stat.S_IWGRP | stat.S_IWOTH)
    ):
        raise LauncherError("PINNED_NODE_INVALID")
    if not directory and path_stat.st_nlink != 1:
        raise LauncherError("PINNED_NODE_INVALID")
    return path_stat


def _pinned_node() -> Path:
    if sys.platform != "darwin" or os.uname().machine != "arm64":
        raise LauncherError("PINNED_NODE_INVALID")
    for directory in (
        EXPECTED_NODE_PATH.parents[2],
        EXPECTED_NODE_PATH.parents[1],
        EXPECTED_NODE_PATH.parent,
        EXPECTED_NODE_ARCHIVE_PATH.parent,
    ):
        _validate_runtime_path(directory, directory=True)
    _validate_runtime_path(EXPECTED_NODE_PATH, directory=False)
    _validate_runtime_path(EXPECTED_NODE_ARCHIVE_PATH, directory=False)
    if (
        _sha256(EXPECTED_NODE_PATH) != EXPECTED_NODE_SHA256
        or _sha256(EXPECTED_NODE_ARCHIVE_PATH) != EXPECTED_NODE_ARCHIVE_SHA256
    ):
        raise LauncherError("PINNED_NODE_INVALID")
    try:
        completed = subprocess.run(
            [str(EXPECTED_NODE_PATH), "--version"],
            check=False,
            env={"LANG": "C", "LC_ALL": "C", "PATH": "/usr/bin:/bin", "TZ": "UTC"},
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=5,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        raise LauncherError("PINNED_NODE_INVALID") from error
    if (
        completed.returncode != 0
        or completed.stdout.decode("ascii", errors="ignore").strip()
        != EXPECTED_NODE_VERSION
        or completed.stderr
    ):
        raise LauncherError("PINNED_NODE_INVALID")
    return EXPECTED_NODE_PATH


def _read_token() -> str:
    directory = Path.home() / "Library" / "Application Support" / "com.vercel.cli"
    directory_flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(
        os, "O_NOFOLLOW", 0
    )
    file_flags = os.O_RDONLY | getattr(os, "O_CLOEXEC", 0) | getattr(
        os, "O_NOFOLLOW", 0
    )
    try:
        directory_descriptor = os.open(directory, directory_flags)
    except OSError as error:
        raise LauncherError("CREDENTIAL_UNAVAILABLE") from error
    try:
        directory_stat = os.fstat(directory_descriptor)
        if (
            not stat.S_ISDIR(directory_stat.st_mode)
            or stat.S_IMODE(directory_stat.st_mode) != 0o700
            or directory_stat.st_uid != os.getuid()
        ):
            raise LauncherError("CREDENTIAL_BOUNDARY_INVALID")
        try:
            credential_descriptor = os.open(
                "auth.json", file_flags, dir_fd=directory_descriptor
            )
        except OSError as error:
            raise LauncherError("CREDENTIAL_UNAVAILABLE") from error
        try:
            credential_stat = os.fstat(credential_descriptor)
            if (
                not stat.S_ISREG(credential_stat.st_mode)
                or stat.S_IMODE(credential_stat.st_mode) != 0o600
                or credential_stat.st_uid != os.getuid()
                or credential_stat.st_size > 64 * 1024
            ):
                raise LauncherError("CREDENTIAL_BOUNDARY_INVALID")
            chunks: list[bytes] = []
            remaining = credential_stat.st_size
            while remaining:
                chunk = os.read(credential_descriptor, min(remaining, 8192))
                if not chunk:
                    raise LauncherError("CREDENTIAL_INVALID")
                chunks.append(chunk)
                remaining -= len(chunk)
        finally:
            os.close(credential_descriptor)
    finally:
        os.close(directory_descriptor)
    try:
        document = json.loads(b"".join(chunks).decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise LauncherError("CREDENTIAL_INVALID") from error
    if not isinstance(document, dict):
        raise LauncherError("CREDENTIAL_INVALID")
    token = document.get("token")
    if not isinstance(token, str) or not token or token.strip() != token:
        raise LauncherError("CREDENTIAL_INVALID")
    return token


def _restrict_inherited_process_state() -> None:
    standard_input = os.open(os.devnull, os.O_RDONLY)
    try:
        standard_error = os.open(os.devnull, os.O_WRONLY)
    except OSError:
        os.close(standard_input)
        raise
    source_descriptors = {standard_input, standard_error}
    os.dup2(standard_input, 0)
    os.dup2(standard_error, 2)
    for descriptor in source_descriptors - {0, 2}:
        os.close(descriptor)
    try:
        soft_limit, _ = resource.getrlimit(resource.RLIMIT_NOFILE)
    except (OSError, ValueError) as error:
        raise LauncherError("PROCESS_BOUNDARY_INVALID") from error
    if not isinstance(soft_limit, int) or soft_limit <= 3:
        raise LauncherError("PROCESS_BOUNDARY_INVALID")
    os.closerange(3, min(soft_limit, 1_048_576))


def _request(
    token: str,
    method: str,
    path: str,
    *,
    body: dict[str, Any] | None = None,
    expected: tuple[int, ...] = (200,),
) -> tuple[int, dict[str, Any] | None]:
    payload = None
    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {token}",
        "User-Agent": "callysto-m0-proof/0",
    }
    if body is not None:
        payload = json.dumps(body, separators=(",", ":")).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(
        VERCEL_API_ORIGIN + path,
        data=payload,
        headers=headers,
        method=method,
    )
    try:
        with URL_OPENER.open(request, timeout=20) as response:
            status_code = response.status
            response_bytes = response.read()
    except urllib.error.HTTPError as error:
        status_code = error.code
        response_bytes = b""
    except (OSError, urllib.error.URLError) as error:
        raise LauncherError("VERCEL_API_UNAVAILABLE") from error
    if status_code not in expected:
        raise LauncherError(f"VERCEL_API_STATUS_{status_code}")
    if not response_bytes:
        return status_code, None
    try:
        response_document = json.loads(response_bytes)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise LauncherError("VERCEL_API_RESPONSE_INVALID") from error
    if not isinstance(response_document, dict):
        raise LauncherError("VERCEL_API_RESPONSE_INVALID")
    return status_code, response_document


def _resolve_team(token: str, slug: str) -> str:
    _, document = _request(token, "GET", "/v2/teams?limit=100")
    teams = document.get("teams") if document else None
    if not isinstance(teams, list):
        raise LauncherError("VERCEL_TEAM_RESPONSE_INVALID")
    matches = [
        team
        for team in teams
        if isinstance(team, dict) and team.get("slug") == slug
    ]
    if len(matches) != 1:
        raise LauncherError("VERCEL_TEAM_NOT_FOUND")
    team_id = matches[0].get("id")
    if not isinstance(team_id, str) or not ID_PATTERN.fullmatch(team_id):
        raise LauncherError("VERCEL_TEAM_RESPONSE_INVALID")
    return team_id


def _resolve_project(
    token: str, team_id: str, name: str, *, create: bool
) -> tuple[str, str]:
    encoded_name = urllib.parse.quote(name, safe="")
    encoded_team = urllib.parse.quote(team_id, safe="")
    status_code, document = _request(
        token,
        "GET",
        f"/v9/projects/{encoded_name}?teamId={encoded_team}",
        expected=(200, 404),
    )
    state = "existing"
    if status_code == 404:
        if not create:
            raise LauncherError("VERCEL_PROJECT_NOT_FOUND")
        _, document = _request(
            token,
            "POST",
            f"/v9/projects?teamId={encoded_team}",
            body={"framework": "nextjs", "name": name},
            expected=(200, 201),
        )
        state = "created"
    project_id = document.get("id") if document else None
    if (
        not isinstance(project_id, str)
        or not ID_PATTERN.fullmatch(project_id)
        or document is None
        or document.get("name") != name
    ):
        raise LauncherError("VERCEL_PROJECT_RESPONSE_INVALID")
    if document.get("link") not in (None, {}) or document.get("env") not in (
        None,
        [],
    ):
        raise LauncherError("VERCEL_PROJECT_NOT_EXCLUSIVE")
    return project_id, state


def _assert_project_has_no_deployments(
    token: str, team_id: str, project_id: str
) -> None:
    encoded_project = urllib.parse.quote(project_id, safe="")
    encoded_team = urllib.parse.quote(team_id, safe="")
    _, document = _request(
        token,
        "GET",
        (
            "/v6/deployments"
            f"?projectId={encoded_project}&teamId={encoded_team}&limit=1"
        ),
    )
    deployments = document.get("deployments") if document else None
    if not isinstance(deployments, list):
        raise LauncherError("VERCEL_DEPLOYMENT_RESPONSE_INVALID")
    if deployments:
        raise LauncherError("VERCEL_PROJECT_NOT_EXCLUSIVE")


def _exec_proof(
    node: Path,
    token: str,
    team_id: str,
    project_id: str,
    project_state: str,
    mode: str,
) -> NoReturn:
    script = Path(__file__).with_name("m0-vercel-sandbox-proof.mjs").resolve()
    if not script.is_file():
        raise LauncherError("PROOF_SCRIPT_UNAVAILABLE")
    environment = {
        "CALLYSTO_VERCEL_PROJECT_EXCLUSIVE": EXPECTED_PROJECT_EXCLUSIVITY_MARKER,
        "CALLYSTO_VERCEL_PROJECT_STATE": project_state,
        "LANG": "C",
        "LC_ALL": "C",
        "PATH": f"{node.parent}:/usr/bin:/bin",
        "TZ": "UTC",
        "VERCEL_PROJECT_ID": project_id,
        "VERCEL_TEAM_ID": team_id,
        "VERCEL_TOKEN": token,
    }
    forwarded_names = (
        ()
        if mode in {"converter", "reconcile"}
        else (
            "CALLYSTO_PROOF_POSTGRES_HOST",
            "CALLYSTO_PROOF_POSTGRES_PORT",
            "CALLYSTO_PROOF_R2_HOST",
        )
    )
    for name in forwarded_names:
        value = os.environ.get(name)
        if not value:
            raise LauncherError("PROOF_TARGET_REQUIRED")
        environment[name] = value
    _restrict_inherited_process_state()
    os.execve(str(node), [str(node), str(script), mode], environment)


def main() -> int:
    stage = "arguments"
    try:
        arguments = _parser().parse_args()
        if arguments.project_name != EXPECTED_PROJECT_NAME:
            raise LauncherError("PROJECT_NAME_INVALID")
        if not TEAM_SLUG_PATTERN.fullmatch(arguments.team_slug):
            raise LauncherError("TEAM_SLUG_INVALID")
        if not arguments.accept_metered_proof:
            raise LauncherError("METERED_PROOF_ACCEPTANCE_REQUIRED")
        stage = "runtime"
        node = _pinned_node()
        stage = "credential"
        token = _read_token()
        stage = "team"
        team_id = _resolve_team(token, arguments.team_slug)
        stage = "project"
        project_id, project_state = _resolve_project(
            token,
            team_id,
            arguments.project_name,
            create=arguments.create_project,
        )
        _assert_project_has_no_deployments(token, team_id, project_id)
        stage = "proof"
        _exec_proof(
            node,
            token,
            team_id,
            project_id,
            project_state,
            arguments.mode,
        )
    except LauncherError as error:
        _safe_error(error.code, stage)
        return 1
    except Exception:
        _safe_error("LAUNCHER_FAILED", stage)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
