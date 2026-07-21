"""Launch the M0 converter proof with a constant child-process contract.

The launcher is the local stand-in for the future orchestrator.  It is the only
module in this proof allowed to create a subprocess.  It forwards only explicit
server-selected paths and a version identifier, supplies a constant non-secret
environment, closes inherited descriptors, and never forwards raw child stderr.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any, NoReturn


RESULT_SCHEMA_VERSION = "callysto.converter-process-result.v0"
ARTIFACT_ID_PATTERN = re.compile(r"^a_[0-9a-f]{32}$")
ERROR_CODE_PATTERN = re.compile(r"^[A-Z][A-Z0-9_]{1,63}$")
SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}$")
CHILD_ENVIRONMENT = {
    "LANG": "C",
    "LC_ALL": "C",
    "TZ": "UTC",
}


class LauncherError(ValueError):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


class SafeArgumentParser(argparse.ArgumentParser):
    def error(self, message: str) -> NoReturn:
        del message
        raise LauncherError("ARGUMENT_INVALID")


def _canonical_json(document: dict[str, Any]) -> bytes:
    return (
        json.dumps(
            document,
            ensure_ascii=False,
            separators=(",", ":"),
            sort_keys=True,
        ).encode("utf-8")
        + b"\n"
    )


def _safe_error(code: str) -> dict[str, str]:
    return {
        "error_code": code,
        "schema_version": RESULT_SCHEMA_VERSION,
        "status": "error",
    }


def _unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    document: dict[str, Any] = {}
    for key, value in pairs:
        if key in document:
            raise LauncherError("CHILD_PROTOCOL_INVALID")
        document[key] = value
    return document


def _reject_constant(value: str) -> NoReturn:
    del value
    raise LauncherError("CHILD_PROTOCOL_INVALID")


def _has_exact_keys(document: object, expected: set[str]) -> bool:
    return isinstance(document, dict) and set(document) == expected


def _is_nonnegative_integer(value: object) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value >= 0


def _valid_artifact(document: object) -> bool:
    if not isinstance(document, dict) or not _has_exact_keys(
        document, {"artifact_id", "byte_size", "file", "sha256"}
    ):
        return False
    artifact_id = document["artifact_id"]
    return (
        isinstance(artifact_id, str)
        and ARTIFACT_ID_PATTERN.fullmatch(artifact_id) is not None
        and _is_nonnegative_integer(document["byte_size"])
        and document["file"] == f"artifacts/{artifact_id}"
        and isinstance(document["sha256"], str)
        and SHA256_PATTERN.fullmatch(document["sha256"]) is not None
    )


def _valid_isolation(document: object) -> bool:
    if not isinstance(document, dict) or not _has_exact_keys(
        document,
        {
            "environment_names",
            "evidence_level",
            "inherited_file_descriptor_closed",
            "network_boundary",
            "notebook_execution",
        },
    ):
        return False
    descriptor_result = document["inherited_file_descriptor_closed"]
    return (
        document["environment_names"] == ["LANG", "LC_ALL", "TZ"]
        and document["evidence_level"] == "local_process_only"
        and (descriptor_result is None or isinstance(descriptor_result, bool))
        and document["network_boundary"] == "not_enforced_by_os_or_container"
        and document["notebook_execution"] == "forbidden_and_not_invoked"
    )


def _valid_manifest(document: object) -> bool:
    if not isinstance(document, dict) or not _has_exact_keys(
        document, {"byte_size", "file", "sha256"}
    ):
        return False
    return (
        _is_nonnegative_integer(document["byte_size"])
        and document["file"] == "manifest.json"
        and isinstance(document["sha256"], str)
        and SHA256_PATTERN.fullmatch(document["sha256"]) is not None
    )


def _valid_success(document: dict[str, Any]) -> bool:
    if not _has_exact_keys(
        document,
        {"artifacts", "isolation", "manifest", "schema_version", "status"},
    ):
        return False
    artifacts = document["artifacts"]
    return (
        document["schema_version"] == RESULT_SCHEMA_VERSION
        and document["status"] == "ok"
        and isinstance(artifacts, list)
        and all(_valid_artifact(artifact) for artifact in artifacts)
        and _valid_isolation(document["isolation"])
        and _valid_manifest(document["manifest"])
    )


def _valid_error(document: dict[str, Any]) -> bool:
    if not _has_exact_keys(document, {"error_code", "schema_version", "status"}):
        return False
    error_code = document["error_code"]
    return (
        document["schema_version"] == RESULT_SCHEMA_VERSION
        and document["status"] == "error"
        and isinstance(error_code, str)
        and ERROR_CODE_PATTERN.fullmatch(error_code) is not None
    )


def _validated_child_document(payload: bytes) -> dict[str, Any]:
    try:
        document = json.loads(
            payload,
            object_pairs_hook=_unique_object,
            parse_constant=_reject_constant,
        )
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise LauncherError("CHILD_PROTOCOL_INVALID") from error
    if not isinstance(document, dict):
        raise LauncherError("CHILD_PROTOCOL_INVALID")
    if not (_valid_success(document) or _valid_error(document)):
        raise LauncherError("CHILD_PROTOCOL_INVALID")
    return document


def _launch(arguments: argparse.Namespace) -> tuple[dict[str, Any], int]:
    converter_path = Path(__file__).with_name("converter_cli.py").resolve()
    child_command = [
        sys.executable,
        "-I",
        "-B",
        "-X",
        "utf8",
        str(converter_path),
        "--input",
        arguments.input,
        "--output-dir",
        arguments.output_dir,
        "--version-id",
        arguments.version_id,
    ]
    if arguments.probe_fd is not None:
        child_command.extend(("--probe-fd", str(arguments.probe_fd)))

    try:
        completed = subprocess.run(
            child_command,
            check=False,
            close_fds=True,
            env=dict(CHILD_ENVIRONMENT),
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=30,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        raise LauncherError("CHILD_START_FAILED") from error

    child_document = _validated_child_document(completed.stdout)
    if completed.stderr:
        raise LauncherError("CHILD_PROTOCOL_INVALID")
    expected_code = 0 if child_document["status"] == "ok" else 2
    if completed.returncode != expected_code:
        raise LauncherError("CHILD_PROTOCOL_INVALID")
    return child_document, completed.returncode


def _parser() -> SafeArgumentParser:
    parser = SafeArgumentParser(description="Launch the Callysto M0 converter process proof")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--version-id", required=True)
    parser.add_argument("--probe-fd", type=int)
    return parser


def main(argv: list[str] | None = None) -> int:
    try:
        arguments = _parser().parse_args(argv)
        document, return_code = _launch(arguments)
    except LauncherError as error:
        document = _safe_error(error.code)
        return_code = 2
    sys.stdout.buffer.write(_canonical_json(document))
    sys.stdout.buffer.flush()
    return return_code


if __name__ == "__main__":
    raise SystemExit(main())
