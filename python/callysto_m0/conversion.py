"""Credential-free, non-executing notebook-to-manifest reference contract.

This is deliberately not the production nbformat/nbconvert renderer. Active and
complex output is blocked in M0 so the data boundary can be tested safely.
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import json
from dataclasses import dataclass
from typing import Any

from .cell_ids import (
    CellIdError,
    cell_source_sha256_hex,
    logical_source,
    normalize_notebook_cell_ids,
)


class ConversionError(ValueError):
    def __init__(self, code: str, detail: str):
        super().__init__(f"{code}: {detail}")
        self.code = code
        self.detail = detail


@dataclass(frozen=True)
class ConversionPolicy:
    max_source_bytes: int = 25 * 1024 * 1024
    max_cells: int = 2_000
    max_single_decoded_output: int = 10 * 1024 * 1024
    max_total_output_bytes: int = 50 * 1024 * 1024
    supported_nbformat_major: tuple[int, ...] = (4,)


@dataclass(frozen=True)
class ConversionResult:
    manifest: dict[str, Any]
    artifacts: dict[str, bytes]

    def canonical_manifest_bytes(self) -> bytes:
        return json.dumps(
            self.manifest,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
        ).encode("utf-8")

    def manifest_sha256(self) -> str:
        return hashlib.sha256(self.canonical_manifest_bytes()).hexdigest()


class _OutputBudget:
    def __init__(self, maximum: int):
        self.maximum = maximum
        self.used = 0

    def consume(self, size: int) -> None:
        self.used += size
        if self.used > self.maximum:
            raise ConversionError("TOTAL_OUTPUT_LIMIT_EXCEEDED", "decoded outputs exceed configured limit")


def _unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ConversionError("JSON_DUPLICATE_KEY", f"duplicate JSON key: {key}")
        result[key] = value
    return result


def _reject_constant(value: str) -> None:
    raise ConversionError("JSON_NONFINITE_NUMBER", f"non-finite JSON number: {value}")


def _text(value: object, *, field: str) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, list) and all(isinstance(part, str) for part in value):
        return "".join(value)
    raise ConversionError("OUTPUT_TEXT_INVALID", f"{field} must be a string or list of strings")


def _safe_metadata(notebook: dict[str, Any]) -> dict[str, str | None]:
    metadata = notebook.get("metadata", {})
    if not isinstance(metadata, dict):
        raise ConversionError("METADATA_INVALID", "notebook metadata must be an object")
    kernelspec = metadata.get("kernelspec", {})
    language_info = metadata.get("language_info", {})
    if not isinstance(kernelspec, dict) or not isinstance(language_info, dict):
        raise ConversionError("METADATA_INVALID", "kernel metadata must be objects")

    def optional_short_string(value: object) -> str | None:
        if value is None:
            return None
        if not isinstance(value, str) or len(value) > 200:
            raise ConversionError("METADATA_INVALID", "kernel metadata string is invalid")
        return value

    return {
        "kernel_name": optional_short_string(kernelspec.get("name")),
        "kernel_language": optional_short_string(language_info.get("name")),
    }


def _raster_signature_matches(mime: str, payload: bytes) -> bool:
    if mime == "image/png":
        return payload.startswith(b"\x89PNG\r\n\x1a\n")
    if mime == "image/jpeg":
        return payload.startswith(b"\xff\xd8\xff")
    if mime == "image/gif":
        return payload.startswith((b"GIF87a", b"GIF89a"))
    return False


def _raster_descriptor(
    *,
    mime: str,
    encoded: object,
    policy: ConversionPolicy,
    budget: _OutputBudget,
    artifacts: dict[str, bytes],
) -> dict[str, Any]:
    encoded_text = _text(encoded, field=mime)
    try:
        payload = base64.b64decode(encoded_text.encode("ascii"), validate=True)
    except (UnicodeEncodeError, binascii.Error) as error:
        raise ConversionError("OUTPUT_BASE64_INVALID", f"invalid base64 for {mime}") from error
    if len(payload) > policy.max_single_decoded_output:
        raise ConversionError("OUTPUT_LIMIT_EXCEEDED", f"decoded {mime} output is too large")
    if not _raster_signature_matches(mime, payload):
        raise ConversionError("OUTPUT_MIME_MISMATCH", f"payload does not match declared {mime}")
    budget.consume(len(payload))
    digest = hashlib.sha256(payload).hexdigest()
    artifact_id = f"a_{digest[:32]}"
    artifacts.setdefault(artifact_id, payload)
    return {
        "presentation": "immutable_raster",
        "artifact_id": artifact_id,
        "mime": mime,
        "sha256": digest,
        "byte_size": len(payload),
        "delivery": "content_gateway_exact_type_nosniff",
    }


def _mime_output(
    data: object,
    *,
    policy: ConversionPolicy,
    budget: _OutputBudget,
    artifacts: dict[str, bytes],
) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise ConversionError("OUTPUT_DATA_INVALID", "MIME data must be an object")

    for mime in ("image/png", "image/jpeg", "image/gif"):
        if mime in data:
            descriptor = _raster_descriptor(
                mime=mime,
                encoded=data[mime],
                policy=policy,
                budget=budget,
                artifacts=artifacts,
            )
            descriptor["omitted_mime_types"] = sorted(key for key in data if key != mime)
            return descriptor

    if "text/plain" in data:
        text = _text(data["text/plain"], field="text/plain")
        encoded_size = len(text.encode("utf-8"))
        if encoded_size > policy.max_single_decoded_output:
            raise ConversionError("OUTPUT_LIMIT_EXCEEDED", "text/plain output is too large")
        budget.consume(encoded_size)
        return {
            "presentation": "escaped_text",
            "text": text,
            "omitted_mime_types": sorted(key for key in data if key != "text/plain"),
        }

    active = {
        "text/html",
        "image/svg+xml",
        "application/javascript",
        "application/vnd.jupyter.widget-view+json",
        "application/vnd.jupyter.widget-state+json",
    }
    blocked = sorted(data)
    return {
        "presentation": "placeholder",
        "reason": (
            "active_or_complex_output_requires_isolated_production_renderer"
            if active.intersection(data)
            else "unsupported_mime_bundle"
        ),
        "blocked_mime_types": blocked,
    }


def _output_descriptor(
    output: object,
    *,
    policy: ConversionPolicy,
    budget: _OutputBudget,
    artifacts: dict[str, bytes],
) -> dict[str, Any]:
    if not isinstance(output, dict):
        raise ConversionError("OUTPUT_INVALID", "cell output must be an object")
    output_type = output.get("output_type")
    if output_type == "stream":
        text = _text(output.get("text", ""), field="stream text")
        size = len(text.encode("utf-8"))
        if size > policy.max_single_decoded_output:
            raise ConversionError("OUTPUT_LIMIT_EXCEEDED", "stream output is too large")
        budget.consume(size)
        return {
            "output_type": "stream",
            "presentation": "escaped_text",
            "stream_name": output.get("name") if output.get("name") in {"stdout", "stderr"} else None,
            "text": text,
        }
    if output_type == "error":
        traceback = _text(output.get("traceback", []), field="traceback")
        ename = output.get("ename", "")
        evalue = output.get("evalue", "")
        if not isinstance(ename, str) or not isinstance(evalue, str):
            raise ConversionError("OUTPUT_TEXT_INVALID", "error name and value must be strings")
        size = len((ename + evalue + traceback).encode("utf-8"))
        if size > policy.max_single_decoded_output:
            raise ConversionError("OUTPUT_LIMIT_EXCEEDED", "error output is too large")
        budget.consume(size)
        return {
            "output_type": "error",
            "presentation": "escaped_text",
            "error_name": ename,
            "error_value": evalue,
            "traceback": traceback,
        }
    if output_type in {"display_data", "execute_result"}:
        descriptor = _mime_output(
            output.get("data", {}), policy=policy, budget=budget, artifacts=artifacts
        )
        descriptor["output_type"] = output_type
        execution_count = output.get("execution_count")
        descriptor["author_supplied_execution_count"] = (
            execution_count if isinstance(execution_count, int) and not isinstance(execution_count, bool) else None
        )
        return descriptor
    return {
        "output_type": "unknown",
        "presentation": "placeholder",
        "reason": "unsupported_output_type",
    }


def convert_notebook_bytes(
    source: bytes,
    *,
    version_id: str,
    policy: ConversionPolicy | None = None,
) -> ConversionResult:
    """Convert bytes to a typed manifest without I/O, credentials, or execution."""

    active_policy = policy or ConversionPolicy()
    if not isinstance(version_id, str) or not version_id:
        raise ConversionError("VERSION_ID_REQUIRED", "version_id must be a non-empty string")
    if not isinstance(source, bytes):
        raise ConversionError("SOURCE_TYPE_INVALID", "source must be bytes")
    if not source:
        raise ConversionError("SOURCE_EMPTY", "notebook is empty")
    if len(source) > active_policy.max_source_bytes:
        raise ConversionError("SOURCE_LIMIT_EXCEEDED", "notebook exceeds configured source limit")
    try:
        text = source.decode("utf-8")
    except UnicodeDecodeError as error:
        raise ConversionError("SOURCE_UTF8_INVALID", "notebook must be UTF-8 JSON") from error
    try:
        notebook = json.loads(
            text,
            object_pairs_hook=_unique_object,
            parse_constant=_reject_constant,
        )
    except json.JSONDecodeError as error:
        raise ConversionError("NOTEBOOK_JSON_INVALID", "notebook is not valid JSON") from error

    if not isinstance(notebook, dict):
        raise ConversionError("NOTEBOOK_TYPE_INVALID", "notebook root must be an object")
    cells = notebook.get("cells")
    if not isinstance(cells, list):
        raise ConversionError("CELLS_INVALID", "notebook cells must be a list")
    if not cells:
        raise ConversionError("CELLS_EMPTY", "zero-cell notebooks are outside the pilot contract")
    if len(cells) > active_policy.max_cells:
        raise ConversionError("CELL_LIMIT_EXCEEDED", "notebook exceeds configured cell limit")
    nbformat = notebook.get("nbformat")
    nbformat_minor = notebook.get("nbformat_minor")
    if isinstance(nbformat, bool) or not isinstance(nbformat, int):
        raise ConversionError("NBFORMAT_INVALID", "nbformat must be an integer")
    if nbformat not in active_policy.supported_nbformat_major:
        raise ConversionError("NBFORMAT_UNSUPPORTED", f"unsupported nbformat major: {nbformat}")
    if isinstance(nbformat_minor, bool) or not isinstance(nbformat_minor, int) or nbformat_minor < 0:
        raise ConversionError("NBFORMAT_INVALID", "nbformat_minor must be a non-negative integer")

    accepted_original_sha256_bytes = hashlib.sha256(source).digest()
    try:
        normalized, actions = normalize_notebook_cell_ids(
            notebook,
            accepted_original_sha256_bytes=accepted_original_sha256_bytes,
        )
    except CellIdError as error:
        raise ConversionError(error.code, error.detail) from error

    artifacts: dict[str, bytes] = {}
    budget = _OutputBudget(active_policy.max_total_output_bytes)
    manifest_cells: list[dict[str, Any]] = []
    for ordinal, cell in enumerate(normalized["cells"]):
        cell_type = cell["cell_type"]
        source_text = logical_source(cell)
        source_mode = "strict_markdown" if cell_type == "markdown" else "escaped_text"
        source_contract: dict[str, Any] = {
            "presentation": source_mode,
            "text": source_text,
        }
        if cell_type == "markdown":
            source_contract["raw_html_allowed"] = False

        outputs = cell.get("outputs", []) if cell_type == "code" else []
        if not isinstance(outputs, list):
            raise ConversionError("OUTPUTS_INVALID", f"cell {ordinal} outputs must be a list")
        manifest_cells.append(
            {
                "id": cell["id"],
                "ordinal": ordinal,
                "cell_type": cell_type,
                "cell_source_sha256": cell_source_sha256_hex(cell),
                "source": source_contract,
                "outputs": [
                    _output_descriptor(
                        output,
                        policy=active_policy,
                        budget=budget,
                        artifacts=artifacts,
                    )
                    for output in outputs
                ],
            }
        )

    safe_metadata = _safe_metadata(normalized)
    manifest = {
        "schema_version": "callysto.render-manifest.v0",
        "version_id": version_id,
        "accepted_original_sha256": accepted_original_sha256_bytes.hex(),
        "nbformat_major": nbformat,
        "nbformat_minor": nbformat_minor,
        "kernel_name": safe_metadata["kernel_name"],
        "kernel_language": safe_metadata["kernel_language"],
        "contract": {
            "notebook_execution": "forbidden",
            "network_access": "forbidden",
            "application_html_injection": "forbidden",
            "markdown": "strict_subset_raw_html_disabled",
            "active_complex_output": "placeholder_in_m0",
            "cell_id_algorithm": "callysto-cell-id-v1",
        },
        "normalization_actions": [
            {
                "ordinal": action.ordinal,
                "action": action.action,
                "algorithm": action.algorithm,
                "cell_id": action.cell_id,
                "cell_source_sha256": action.cell_source_sha256,
            }
            for action in actions
        ],
        "cells": manifest_cells,
    }
    return ConversionResult(manifest=manifest, artifacts=artifacts)
