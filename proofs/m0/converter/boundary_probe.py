"""Emit an allowlisted nested-container boundary result for the M0 proof."""

from __future__ import annotations

import errno
import json
import os
import resource
import socket
from pathlib import Path


EXPECTED_ENVIRONMENT = {"HOME", "HOSTNAME", "LANG", "LC_ALL", "PATH", "TZ"}
ADDRESS_SPACE_LIMIT_BYTES = 512 * 1024 * 1024
CPU_TIME_LIMIT_SECONDS = 30
DENIED_CONNECT_ERRNOS = {
    errno.EACCES,
    errno.EPERM,
    errno.ENETUNREACH,
    errno.EHOSTUNREACH,
    errno.ETIMEDOUT,
}


def _denied_connect(host: str, port: int) -> bool:
    try:
        connection = socket.create_connection((host, port), timeout=2)
    except OSError as error:
        return error.errno in DENIED_CONNECT_ERRNOS
    connection.close()
    return False


def _denied_dns() -> bool:
    try:
        socket.getaddrinfo("example.com", 443)
    except socket.gaierror as error:
        return error.errno in {socket.EAI_AGAIN, socket.EAI_FAIL, socket.EAI_NONAME}
    return False


def _status_value(name: str) -> str | None:
    try:
        for line in Path("/proc/self/status").read_text(encoding="utf-8").splitlines():
            key, separator, value = line.partition(":")
            if separator and key == name:
                return value.strip()
    except OSError:
        return None
    return None


def _write_probe(path: Path) -> bool:
    try:
        path.write_text("boundary-probe", encoding="utf-8")
    except OSError:
        return False
    try:
        path.unlink()
    except OSError:
        return False
    return True


def _read_probe(path: Path) -> bool:
    try:
        return bool(path.read_bytes())
    except OSError:
        return False


def _list_probe(path: Path) -> bool:
    try:
        list(path.iterdir())
    except OSError:
        return False
    return True


def _main() -> int:
    try:
        resource.setrlimit(
            resource.RLIMIT_AS,
            (ADDRESS_SPACE_LIMIT_BYTES, ADDRESS_SPACE_LIMIT_BYTES),
        )
        resource.setrlimit(
            resource.RLIMIT_CPU,
            (CPU_TIME_LIMIT_SECONDS, CPU_TIME_LIMIT_SECONDS),
        )
    except (OSError, ValueError):
        pass
    result = {
        "address_space_limited": resource.getrlimit(resource.RLIMIT_AS)
        == (ADDRESS_SPACE_LIMIT_BYTES, ADDRESS_SPACE_LIMIT_BYTES),
        "capabilities_dropped": _status_value("CapEff") == "0000000000000000",
        "cpu_time_limited": resource.getrlimit(resource.RLIMIT_CPU)
        == (CPU_TIME_LIMIT_SECONDS, CPU_TIME_LIMIT_SECONDS),
        "dns_blocked": _denied_dns(),
        "environment_exact": set(os.environ) == EXPECTED_ENVIRONMENT,
        "input_readable": _read_probe(Path("/input/source.ipynb")),
        "input_read_only": not _write_probe(Path("/input/must-not-write")),
        "metadata_blocked": _denied_connect("169.254.169.254", 80),
        "no_new_privileges": _status_value("NoNewPrivs") == "1",
        "output_listable": _list_probe(Path("/output")),
        "output_writable": _write_probe(Path("/output/boundary-probe")),
        "public_ip_blocked": _denied_connect("1.1.1.1", 443),
        "root_read_only": not _write_probe(Path("/must-not-write")),
        "uid_non_root": os.geteuid() == 65_532,
    }
    print(json.dumps(result, separators=(",", ":"), sort_keys=True))
    return 0 if all(result.values()) else 2


if __name__ == "__main__":
    raise SystemExit(_main())
