#!/usr/bin/env python3
"""Build a deterministic Docker-loadable M0 converter proof image.

The inputs are exact pinned Alpine minirootfs and python-build-standalone musl
archives. The output is a compressed image archive suitable for Docker load.
This builder performs no network access.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
import os
import tarfile
import tempfile
from pathlib import Path
from typing import BinaryIO


EXPECTED_PYTHON_ARCHIVE_SHA256 = (
    "f25064ecb3b07cfe2440b178e72001cf1e0d69a5e53625ca3a32b7ae4e2fdcc6"
)
EXPECTED_BASE_ROOTFS_SHA256 = (
    "41f73e3cf5fa919b8aa5ca6b30dc48f0da2720776d7423e2a7748211456fe081"
)
IMAGE_TAG = "callysto-m0-converter:proof"
REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
SOURCE_PROVENANCE_PATH = (
    REPOSITORY_ROOT / "proofs" / "m0" / "converter" / "source-provenance.json"
)
EXPECTED_SOURCE_PROVENANCE = {
    "schema_version": "callysto.converter-source-provenance.v0",
    "sources": [
        {
            "asset_name": "alpine-minirootfs-3.24.1-x86_64.tar.gz",
            "asset_url": "https://dl-cdn.alpinelinux.org/alpine/v3.24/releases/x86_64/alpine-minirootfs-3.24.1-x86_64.tar.gz",
            "kind": "base_rootfs",
            "license": "package-specific SPDX licenses recorded by Alpine package metadata",
            "license_source": "https://pkgs.alpinelinux.org/packages?branch=v3.24&arch=x86_64",
            "platform": "linux-x86_64-musl",
            "publisher": "Alpine Linux",
            "release": "3.24.1",
            "sha256": EXPECTED_BASE_ROOTFS_SHA256,
            "upstream_digest_source": "https://dl-cdn.alpinelinux.org/alpine/v3.24/releases/x86_64/alpine-minirootfs-3.24.1-x86_64.tar.gz.sha256",
        },
        {
            "asset_name": "cpython-3.14.6+20260623-x86_64-unknown-linux-musl-install_only_stripped.tar.gz",
            "asset_url": "https://github.com/astral-sh/python-build-standalone/releases/download/20260623/cpython-3.14.6%2B20260623-x86_64-unknown-linux-musl-install_only_stripped.tar.gz",
            "kind": "python_runtime",
            "license": "MPL-2.0 build project; CPython and bundled components retain upstream licenses",
            "license_source": "https://github.com/astral-sh/python-build-standalone/blob/main/LICENSE",
            "platform": "linux-x86_64-musl",
            "publisher": "Astral python-build-standalone",
            "release": "20260623",
            "sha256": EXPECTED_PYTHON_ARCHIVE_SHA256,
            "upstream_digest_source": "https://api.github.com/repos/astral-sh/python-build-standalone/releases/tags/20260623",
        },
    ],
    "verified_at": "2026-07-21",
}
PROJECT_FILES = (
    "python/callysto_m0/__init__.py",
    "python/callysto_m0/cell_ids.py",
    "python/callysto_m0/conversion.py",
    "python/callysto_m0/converter_cli.py",
    "python/callysto_m0/converter_launcher.py",
    "proofs/m0/converter/boundary_probe.py",
)


class BuilderError(RuntimeError):
    pass


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        while chunk := source.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def _validate_source_provenance() -> str:
    try:
        provenance_bytes = SOURCE_PROVENANCE_PATH.read_bytes()
        provenance = json.loads(provenance_bytes)
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise BuilderError("source provenance is unavailable") from error
    if provenance != EXPECTED_SOURCE_PROVENANCE:
        raise BuilderError("source provenance does not match the pinned contract")
    return hashlib.sha256(provenance_bytes).hexdigest()


def _normalized(info: tarfile.TarInfo, name: str) -> tarfile.TarInfo:
    normalized = tarfile.TarInfo(name=name)
    normalized.type = info.type
    normalized.mode = info.mode
    normalized.size = info.size
    normalized.linkname = info.linkname
    if info.islnk() and normalized.linkname.startswith("python/"):
        normalized.linkname = "opt/python/" + normalized.linkname.removeprefix(
            "python/"
        )
    normalized.uid = 0
    normalized.gid = 0
    normalized.uname = "root"
    normalized.gname = "root"
    normalized.mtime = 0
    return normalized


def _add_bytes(
    archive: tarfile.TarFile, name: str, payload: bytes, mode: int = 0o444
) -> None:
    info = tarfile.TarInfo(name=name)
    info.mode = mode
    info.size = len(payload)
    info.uid = 0
    info.gid = 0
    info.uname = "root"
    info.gname = "root"
    info.mtime = 0
    archive.addfile(info, io.BytesIO(payload))


def _add_directory(archive: tarfile.TarFile, name: str, mode: int = 0o555) -> None:
    info = tarfile.TarInfo(name=name.rstrip("/") + "/")
    info.type = tarfile.DIRTYPE
    info.mode = mode
    info.uid = 0
    info.gid = 0
    info.uname = "root"
    info.gname = "root"
    info.mtime = 0
    archive.addfile(info)


def _copy_python(source: tarfile.TarFile, layer: tarfile.TarFile) -> None:
    members = sorted(source.getmembers(), key=lambda member: member.name)
    for member in members:
        if member.name == "python":
            name = "opt/python"
        elif member.name.startswith("python/"):
            name = "opt/python/" + member.name.removeprefix("python/")
        else:
            raise BuilderError("unexpected Python archive member")
        normalized = _normalized(member, name)
        extracted: BinaryIO | None = (
            source.extractfile(member) if member.isfile() else None
        )
        layer.addfile(normalized, extracted)


def _copy_base_rootfs(source: tarfile.TarFile, layer: tarfile.TarFile) -> None:
    replaced_paths = {"etc/group", "etc/passwd", "opt", "tmp"}
    members = sorted(source.getmembers(), key=lambda member: member.name)
    for member in members:
        name = member.name.removeprefix("./").rstrip("/")
        if not name or name.startswith("/") or ".." in Path(name).parts:
            if not name:
                continue
            raise BuilderError("unexpected base rootfs member")
        if name in replaced_paths:
            continue
        normalized = _normalized(member, name)
        extracted: BinaryIO | None = (
            source.extractfile(member) if member.isfile() else None
        )
        layer.addfile(normalized, extracted)


def _build_layer(base_rootfs: Path, python_archive: Path, layer_path: Path) -> str:
    with (
        tarfile.open(base_rootfs, "r:gz") as base,
        tarfile.open(python_archive, "r:gz") as source,
        tarfile.open(layer_path, "w", format=tarfile.PAX_FORMAT) as layer,
    ):
        _copy_base_rootfs(base, layer)
        _add_directory(layer, "opt")
        _copy_python(source, layer)
        for directory in (
            "input",
            "nonexistent",
            "opt/callysto",
            "opt/callysto/proofs",
            "opt/callysto/proofs/m0",
            "opt/callysto/proofs/m0/converter",
            "opt/callysto/python",
            "opt/callysto/python/callysto_m0",
            "output",
            "tmp",
            "work",
        ):
            _add_directory(layer, directory, 0o555)
        _add_bytes(
            layer,
            "etc/passwd",
            b"callysto:x:65532:65532:Callysto proof:/nonexistent:/sbin/nologin\n",
        )
        _add_bytes(layer, "etc/group", b"callysto:x:65532:\n")
        for relative_path in PROJECT_FILES:
            source_path = REPOSITORY_ROOT / relative_path
            if relative_path == "proofs/m0/converter/boundary_probe.py":
                target = "opt/callysto/boundary_probe.py"
            else:
                target = "opt/callysto/" + relative_path
            _add_bytes(layer, target, source_path.read_bytes())
    return _sha256(layer_path)


def _config(layer_digest: str) -> bytes:
    document = {
        "architecture": "amd64",
        "config": {
            "Env": [
                "HOME=/nonexistent",
                "LANG=C",
                "LC_ALL=C",
                "PATH=/opt/python/bin:/usr/bin:/bin",
                "TZ=UTC",
            ],
            "User": "65532:65532",
            "WorkingDir": "/work",
        },
        "created": "1970-01-01T00:00:00Z",
        "history": [
            {
                "comment": "Callysto M0 deterministic converter boundary proof",
                "created": "1970-01-01T00:00:00Z",
            }
        ],
        "os": "linux",
        "rootfs": {"diff_ids": [f"sha256:{layer_digest}"], "type": "layers"},
    }
    return json.dumps(document, separators=(",", ":"), sort_keys=True).encode("utf-8")


def _write_image_archive(
    *,
    config_bytes: bytes,
    config_name: str,
    layer_path: Path,
    manifest_bytes: bytes,
    output: Path,
) -> None:
    temporary_prefix = f".{output.name}."
    with tempfile.TemporaryDirectory(
        dir=output.parent, prefix=temporary_prefix
    ) as temporary:
        temporary_output = Path(temporary) / "image.tar.gz"
        flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
        flags |= getattr(os, "O_CLOEXEC", 0)
        flags |= getattr(os, "O_NOFOLLOW", 0)
        file_descriptor = os.open(temporary_output, flags, 0o600)
        try:
            raw_output = os.fdopen(file_descriptor, "wb")
        except BaseException:
            os.close(file_descriptor)
            raise
        with raw_output:
            with (
                gzip.GzipFile(
                    filename="",
                    fileobj=raw_output,
                    mode="wb",
                    compresslevel=9,
                    mtime=0,
                ) as compressed_output,
                tarfile.open(
                    fileobj=compressed_output,
                    mode="w",
                    format=tarfile.PAX_FORMAT,
                ) as image,
            ):
                _add_bytes(image, config_name, config_bytes)
                _add_bytes(image, "manifest.json", manifest_bytes)
                layer_info = tarfile.TarInfo(name="layer.tar")
                layer_info.mode = 0o400
                layer_info.size = layer_path.stat().st_size
                layer_info.uid = 0
                layer_info.gid = 0
                layer_info.uname = "root"
                layer_info.gname = "root"
                layer_info.mtime = 0
                with layer_path.open("rb") as layer:
                    image.addfile(layer_info, layer)
            raw_output.flush()
            os.fsync(raw_output.fileno())
        os.replace(temporary_output, output)


def _build_image(
    base_rootfs: Path, python_archive: Path, output: Path
) -> dict[str, object]:
    source_provenance_sha256 = _validate_source_provenance()
    if not base_rootfs.is_file() or base_rootfs.is_symlink():
        raise BuilderError("Base rootfs archive is unavailable")
    if _sha256(base_rootfs) != EXPECTED_BASE_ROOTFS_SHA256:
        raise BuilderError("Base rootfs archive digest mismatch")
    if not python_archive.is_file() or python_archive.is_symlink():
        raise BuilderError("Python archive is unavailable")
    if _sha256(python_archive) != EXPECTED_PYTHON_ARCHIVE_SHA256:
        raise BuilderError("Python archive digest mismatch")
    output.parent.mkdir(parents=True, exist_ok=True)
    old_umask = os.umask(0o077)
    try:
        with tempfile.TemporaryDirectory(prefix="callysto-image-") as temporary:
            temporary_root = Path(temporary)
            layer_path = temporary_root / "layer.tar"
            layer_digest = _build_layer(base_rootfs, python_archive, layer_path)
            config_bytes = _config(layer_digest)
            config_name = hashlib.sha256(config_bytes).hexdigest() + ".json"
            manifest_bytes = json.dumps(
                [
                    {
                        "Config": config_name,
                        "Layers": ["layer.tar"],
                        "RepoTags": [IMAGE_TAG],
                    }
                ],
                separators=(",", ":"),
                sort_keys=True,
            ).encode("utf-8")
            _write_image_archive(
                config_bytes=config_bytes,
                config_name=config_name,
                layer_path=layer_path,
                manifest_bytes=manifest_bytes,
                output=output,
            )
    finally:
        os.umask(old_umask)
    os.chmod(output, 0o600)
    return {
        "base_rootfs_sha256": EXPECTED_BASE_ROOTFS_SHA256,
        "image_archive_sha256": _sha256(output),
        "image_tag": IMAGE_TAG,
        "python_archive_sha256": EXPECTED_PYTHON_ARCHIVE_SHA256,
        "schema_version": "callysto.converter-image-build.v0",
        "source_provenance_sha256": source_provenance_sha256,
        "status": "ok",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-rootfs", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--python-archive", required=True, type=Path)
    arguments = parser.parse_args()
    try:
        result = _build_image(
            arguments.base_rootfs, arguments.python_archive, arguments.output
        )
    except Exception:
        result = {
            "error_code": "IMAGE_BUILD_FAILED",
            "schema_version": "callysto.converter-image-build.v0",
            "status": "error",
        }
        return_code = 1
    else:
        return_code = 0
    print(json.dumps(result, separators=(",", ":"), sort_keys=True))
    return return_code


if __name__ == "__main__":
    raise SystemExit(main())
