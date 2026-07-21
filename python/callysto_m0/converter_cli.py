"""Local-process proof CLI for credential-free notebook conversion.

This is Milestone 0 evidence, not the production converter sandbox.  It proves
that a child process can consume only server-selected local paths, immediately
discard its inherited environment, close inherited file descriptors, and call
the existing non-executing conversion contract.  It deliberately does not
claim an operating-system or container network/filesystem boundary.
"""

from __future__ import annotations

import argparse
import errno
import hashlib
import json
import os
import re
import resource
import stat
import sys
from pathlib import Path
from typing import Any, NoReturn


RESULT_SCHEMA_VERSION = "callysto.converter-process-result.v0"
MAX_SOURCE_BYTES = 25 * 1024 * 1024
SAFE_ENVIRONMENT = {
    "LANG": "C",
    "LC_ALL": "C",
    "TZ": "UTC",
}
VERSION_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
ERROR_CODE_PATTERN = re.compile(r"^[A-Z][A-Z0-9_]{1,63}$")
ARTIFACT_ID_PATTERN = re.compile(r"^a_[0-9a-f]{32}$")
ADDRESS_SPACE_LIMIT_BYTES = 512 * 1024 * 1024
CPU_TIME_LIMIT_SECONDS = 30


class ConverterCliError(ValueError):
    """A public-safe, path-free failure produced by this process boundary."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


class SafeArgumentParser(argparse.ArgumentParser):
    """Prevent argparse from echoing rejected path or environment values."""

    def error(self, message: str) -> NoReturn:
        del message
        raise ConverterCliError("ARGUMENT_INVALID")


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


def _emit(document: dict[str, Any]) -> None:
    sys.stdout.buffer.write(_canonical_json(document))
    sys.stdout.buffer.flush()


def _safe_error(code: str) -> dict[str, str]:
    safe_code = code if ERROR_CODE_PATTERN.fullmatch(code) else "CONVERTER_FAILED"
    return {
        "error_code": safe_code,
        "schema_version": RESULT_SCHEMA_VERSION,
        "status": "error",
    }


def _sanitize_environment() -> tuple[str, ...]:
    """Replace, rather than filter, the inherited process environment."""

    os.environ.clear()
    os.environ.update(SAFE_ENVIRONMENT)
    return tuple(sorted(os.environ))


def _apply_resource_limits() -> None:
    """Apply hard process limits before reading any notebook bytes."""

    if sys.platform != "linux":
        return
    try:
        resource.setrlimit(
            resource.RLIMIT_AS,
            (ADDRESS_SPACE_LIMIT_BYTES, ADDRESS_SPACE_LIMIT_BYTES),
        )
        resource.setrlimit(
            resource.RLIMIT_CPU,
            (CPU_TIME_LIMIT_SECONDS, CPU_TIME_LIMIT_SECONDS),
        )
        address_space = resource.getrlimit(resource.RLIMIT_AS)
        cpu_time = resource.getrlimit(resource.RLIMIT_CPU)
    except (OSError, ValueError) as error:
        raise ConverterCliError("RESOURCE_LIMIT_FAILED") from error
    if address_space != (
        ADDRESS_SPACE_LIMIT_BYTES,
        ADDRESS_SPACE_LIMIT_BYTES,
    ) or cpu_time != (CPU_TIME_LIMIT_SECONDS, CPU_TIME_LIMIT_SECONDS):
        raise ConverterCliError("RESOURCE_LIMIT_FAILED")


def _open_file_limit() -> int:
    maximum = 65_536
    try:
        import resource

        soft_limit, _ = resource.getrlimit(resource.RLIMIT_NOFILE)
        if isinstance(soft_limit, int) and soft_limit > 0:
            maximum = min(soft_limit, 1_048_576)
    except (ImportError, OSError, ValueError):
        try:
            configured = os.sysconf("SC_OPEN_MAX")
            if isinstance(configured, int) and configured > 0:
                maximum = min(configured, 1_048_576)
        except (AttributeError, OSError, ValueError):
            pass
    return maximum


def _close_inherited_file_descriptors() -> None:
    """Close every non-stdio descriptor supported by the local platform."""

    os.closerange(3, _open_file_limit())


def _file_descriptor_is_closed(file_descriptor: int | None) -> bool | None:
    if file_descriptor is None:
        return None
    if file_descriptor < 3:
        raise ConverterCliError("PROBE_FILE_DESCRIPTOR_INVALID")
    try:
        os.fstat(file_descriptor)
    except OSError as error:
        if error.errno == errno.EBADF:
            return True
        raise ConverterCliError("PROBE_FILE_DESCRIPTOR_CHECK_FAILED") from error
    return False


def _server_selected_path(raw_path: str) -> Path:
    if not raw_path or "\x00" in raw_path:
        raise ConverterCliError("PATH_INVALID")
    return Path(os.path.abspath(raw_path))


def _validate_output_directory(path: Path) -> None:
    try:
        path_stat = path.lstat()
    except OSError as error:
        raise ConverterCliError("OUTPUT_DIRECTORY_UNAVAILABLE") from error
    if stat.S_ISLNK(path_stat.st_mode) or not stat.S_ISDIR(path_stat.st_mode):
        raise ConverterCliError("OUTPUT_DIRECTORY_INVALID")
    try:
        if next(path.iterdir(), None) is not None:
            raise ConverterCliError("OUTPUT_DIRECTORY_NOT_EMPTY")
    except OSError as error:
        raise ConverterCliError("OUTPUT_DIRECTORY_UNAVAILABLE") from error


def _read_server_selected_notebook(path: Path) -> bytes:
    if path.suffix != ".ipynb":
        raise ConverterCliError("INPUT_EXTENSION_INVALID")
    try:
        path_stat = path.lstat()
    except OSError as error:
        raise ConverterCliError("INPUT_UNAVAILABLE") from error
    if stat.S_ISLNK(path_stat.st_mode) or not stat.S_ISREG(path_stat.st_mode):
        raise ConverterCliError("INPUT_FILE_INVALID")

    flags = os.O_RDONLY
    flags |= getattr(os, "O_CLOEXEC", 0)
    flags |= getattr(os, "O_NOFOLLOW", 0)
    try:
        file_descriptor = os.open(path, flags)
    except OSError as error:
        raise ConverterCliError("INPUT_UNAVAILABLE") from error

    chunks: list[bytes] = []
    total = 0
    try:
        opened_stat = os.fstat(file_descriptor)
        if not stat.S_ISREG(opened_stat.st_mode):
            raise ConverterCliError("INPUT_FILE_INVALID")
        while True:
            chunk = os.read(file_descriptor, min(65_536, MAX_SOURCE_BYTES + 1 - total))
            if not chunk:
                break
            chunks.append(chunk)
            total += len(chunk)
            if total > MAX_SOURCE_BYTES:
                raise ConverterCliError("SOURCE_LIMIT_EXCEEDED")
    except OSError as error:
        raise ConverterCliError("INPUT_READ_FAILED") from error
    finally:
        os.close(file_descriptor)
    return b"".join(chunks)


def _atomic_write(path: Path, payload: bytes) -> None:
    temporary_path = path.with_name(f".{path.name}.tmp")
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    flags |= getattr(os, "O_CLOEXEC", 0)
    file_descriptor: int | None = None
    try:
        file_descriptor = os.open(temporary_path, flags, 0o600)
        with os.fdopen(file_descriptor, "wb", closefd=True) as output:
            file_descriptor = None
            output.write(payload)
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary_path, path)
    except OSError as error:
        if file_descriptor is not None:
            os.close(file_descriptor)
        try:
            temporary_path.unlink(missing_ok=True)
        except OSError:
            pass
        raise ConverterCliError("OUTPUT_WRITE_FAILED") from error


def _load_conversion_contract() -> tuple[type[Any], Any]:
    """Load project code only after the environment and descriptors are clean."""

    package_root = str(Path(__file__).resolve().parents[1])
    sys.path.insert(0, package_root)
    try:
        from callysto_m0.conversion import ConversionError, convert_notebook_bytes
    finally:
        if sys.path[0] == package_root:
            del sys.path[0]
    return ConversionError, convert_notebook_bytes


def _write_artifacts(output_directory: Path, artifacts: dict[str, bytes]) -> list[dict[str, Any]]:
    if not artifacts:
        return []
    artifact_directory = output_directory / "artifacts"
    try:
        artifact_directory.mkdir(mode=0o700)
    except OSError as error:
        raise ConverterCliError("OUTPUT_WRITE_FAILED") from error

    descriptors: list[dict[str, Any]] = []
    for artifact_id, payload in sorted(artifacts.items()):
        if not ARTIFACT_ID_PATTERN.fullmatch(artifact_id) or not isinstance(payload, bytes):
            raise ConverterCliError("ARTIFACT_CONTRACT_INVALID")
        artifact_path = artifact_directory / artifact_id
        _atomic_write(artifact_path, payload)
        descriptors.append(
            {
                "artifact_id": artifact_id,
                "byte_size": len(payload),
                "file": f"artifacts/{artifact_id}",
                "sha256": hashlib.sha256(payload).hexdigest(),
            }
        )
    return descriptors


def _convert(arguments: argparse.Namespace) -> dict[str, Any]:
    _apply_resource_limits()
    os.umask(0o077)
    environment_names = _sanitize_environment()
    _close_inherited_file_descriptors()
    inherited_file_descriptor_closed = _file_descriptor_is_closed(arguments.probe_fd)

    if not VERSION_ID_PATTERN.fullmatch(arguments.version_id):
        raise ConverterCliError("VERSION_ID_INVALID")
    input_path = _server_selected_path(arguments.input)
    output_directory = _server_selected_path(arguments.output_dir)
    _validate_output_directory(output_directory)
    source = _read_server_selected_notebook(input_path)

    ConversionError, convert_notebook_bytes = _load_conversion_contract()
    try:
        conversion_result = convert_notebook_bytes(source, version_id=arguments.version_id)
    except ConversionError as error:
        raise ConverterCliError(error.code) from error

    manifest_bytes = conversion_result.canonical_manifest_bytes() + b"\n"
    artifact_descriptors = _write_artifacts(output_directory, conversion_result.artifacts)
    _atomic_write(output_directory / "manifest.json", manifest_bytes)

    result_document: dict[str, Any] = {
        "artifacts": artifact_descriptors,
        "isolation": {
            "environment_names": list(environment_names),
            "evidence_level": "local_process_only",
            "inherited_file_descriptor_closed": inherited_file_descriptor_closed,
            "network_boundary": "not_enforced_by_os_or_container",
            "notebook_execution": "forbidden_and_not_invoked",
        },
        "manifest": {
            "byte_size": len(manifest_bytes),
            "file": "manifest.json",
            "sha256": hashlib.sha256(manifest_bytes).hexdigest(),
        },
        "schema_version": RESULT_SCHEMA_VERSION,
        "status": "ok",
    }
    result_bytes = _canonical_json(result_document)
    _atomic_write(output_directory / "result.json", result_bytes)
    return result_document


def _parser() -> SafeArgumentParser:
    parser = SafeArgumentParser(description="Run the Callysto M0 local converter process proof")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--version-id", required=True)
    parser.add_argument("--probe-fd", type=int)
    return parser


def main(argv: list[str] | None = None) -> int:
    try:
        arguments = _parser().parse_args(argv)
        result = _convert(arguments)
    except ConverterCliError as error:
        _emit(_safe_error(error.code))
        return 2
    except Exception:
        _emit(_safe_error("CONVERTER_FAILED"))
        return 2
    _emit(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
