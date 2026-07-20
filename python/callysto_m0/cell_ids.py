"""Executable proof of the accepted ``callysto-cell-id-v1`` contract.

The original notebook remains byte-preserved elsewhere. This module receives
its already-computed binary SHA-256 digest, returns a deep-copied normalized
object, and records every generated ID. It has no secret or collision retry.
"""

from __future__ import annotations

import base64
import copy
import hashlib
import re
import struct
from dataclasses import dataclass
from typing import Any


ALGORITHM_ID = "callysto-cell-id-v1"
DOMAIN_SEPARATOR = ALGORITHM_ID.encode("utf-8") + b"\x00"
CELL_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
GENERATED_CELL_ID_PATTERN = re.compile(r"^cly_[a-z2-7]{52}$")
CELL_TYPES = frozenset({"code", "markdown", "raw"})


class CellIdError(ValueError):
    """A notebook cannot be normalized without violating identity rules."""

    def __init__(self, code: str, detail: str):
        super().__init__(f"{code}: {detail}")
        self.code = code
        self.detail = detail


@dataclass(frozen=True)
class CellIdMaterial:
    accepted_original_sha256_bytes: bytes
    ordinal: int
    cell_type: str
    cell_source_utf8: bytes
    cell_source_sha256_bytes: bytes
    payload: bytes
    id_digest: bytes
    cell_id: str


@dataclass(frozen=True)
class NormalizationAction:
    ordinal: int
    action: str
    algorithm: str
    cell_id: str
    cell_source_sha256: str


def logical_source(cell: dict[str, Any]) -> str:
    """Decode the canonical logical source without normalization.

    A JSON source string is used as decoded. A list of strings is concatenated
    in order with no separator. No Unicode or newline normalization occurs.
    """

    source = cell.get("source", "")
    if isinstance(source, str):
        return source
    if isinstance(source, list) and all(isinstance(part, str) for part in source):
        return "".join(source)
    raise CellIdError("CELL_SOURCE_INVALID", "cell source must be a string or list of strings")


def cell_source_sha256_hex(cell: dict[str, Any]) -> str:
    """Return the logical cell-source SHA-256 as display/storage hex."""

    return hashlib.sha256(logical_source(cell).encode("utf-8")).hexdigest()


def is_valid_cell_id(value: object) -> bool:
    return isinstance(value, str) and CELL_ID_PATTERN.fullmatch(value) is not None


def derive_cell_id_material(
    *,
    accepted_original_sha256_bytes: bytes,
    ordinal: int,
    cell_type: str,
    cell_source_text: str,
) -> CellIdMaterial:
    """Build the exact binary payload and generated ID for one cell."""

    if not isinstance(accepted_original_sha256_bytes, bytes) or len(accepted_original_sha256_bytes) != 32:
        raise CellIdError(
            "ACCEPTED_ORIGINAL_DIGEST_INVALID",
            "accepted original digest must be the 32 binary SHA-256 bytes, not hex text",
        )
    if isinstance(ordinal, bool) or not isinstance(ordinal, int) or not 0 <= ordinal < 2**64:
        raise CellIdError("CELL_ORDINAL_INVALID", "ordinal must fit unsigned 64-bit")
    if cell_type not in CELL_TYPES:
        raise CellIdError("CELL_TYPE_INVALID", f"unsupported cell type: {cell_type!r}")
    if not isinstance(cell_source_text, str):
        raise CellIdError("CELL_SOURCE_INVALID", "logical cell source must be a string")

    cell_source_utf8 = cell_source_text.encode("utf-8")
    cell_source_sha256_bytes = hashlib.sha256(cell_source_utf8).digest()
    payload = b"".join(
        (
            DOMAIN_SEPARATOR,
            accepted_original_sha256_bytes,
            struct.pack(">Q", ordinal),
            b"\x00",
            cell_type.encode("utf-8"),
            b"\x00",
            cell_source_sha256_bytes,
        )
    )
    id_digest = hashlib.sha256(payload).digest()
    encoded = base64.b32encode(id_digest).decode("ascii").rstrip("=").lower()
    cell_id = f"cly_{encoded}"
    assert len(cell_id) == 56
    assert GENERATED_CELL_ID_PATTERN.fullmatch(cell_id)
    return CellIdMaterial(
        accepted_original_sha256_bytes=accepted_original_sha256_bytes,
        ordinal=ordinal,
        cell_type=cell_type,
        cell_source_utf8=cell_source_utf8,
        cell_source_sha256_bytes=cell_source_sha256_bytes,
        payload=payload,
        id_digest=id_digest,
        cell_id=cell_id,
    )


def deterministic_cell_id(
    *,
    accepted_original_sha256_bytes: bytes,
    ordinal: int,
    cell_type: str,
    cell_source_text: str,
) -> str:
    return derive_cell_id_material(
        accepted_original_sha256_bytes=accepted_original_sha256_bytes,
        ordinal=ordinal,
        cell_type=cell_type,
        cell_source_text=cell_source_text,
    ).cell_id


def normalize_notebook_cell_ids(
    notebook: dict[str, Any], *, accepted_original_sha256_bytes: bytes
) -> tuple[dict[str, Any], tuple[NormalizationAction, ...]]:
    """Preserve valid IDs and deterministically fill only missing IDs.

    Supplied invalid/duplicate IDs and any generated collision fail closed. The
    algorithm never retries with a counter or guesses another anchor.
    """

    if not isinstance(accepted_original_sha256_bytes, bytes) or len(accepted_original_sha256_bytes) != 32:
        raise CellIdError(
            "ACCEPTED_ORIGINAL_DIGEST_INVALID",
            "accepted original digest must be exactly 32 binary bytes",
        )
    if not isinstance(notebook, dict):
        raise CellIdError("NOTEBOOK_TYPE_INVALID", "notebook must be an object")
    cells = notebook.get("cells")
    if not isinstance(cells, list):
        raise CellIdError("CELLS_INVALID", "notebook cells must be a list")

    normalized = copy.deepcopy(notebook)
    normalized_cells = normalized["cells"]
    seen: set[str] = set()

    for ordinal, cell in enumerate(normalized_cells):
        if not isinstance(cell, dict):
            raise CellIdError("CELL_INVALID", f"cell {ordinal} must be an object")
        if cell.get("cell_type") not in CELL_TYPES:
            raise CellIdError("CELL_TYPE_INVALID", f"cell {ordinal} has unsupported type")
        logical_source(cell)
        if "id" not in cell:
            continue
        supplied = cell["id"]
        if not is_valid_cell_id(supplied):
            raise CellIdError("CELL_ID_INVALID", f"cell {ordinal} has an invalid supplied ID")
        if supplied in seen:
            raise CellIdError("CELL_ID_DUPLICATE", f"duplicate supplied cell ID: {supplied}")
        seen.add(supplied)

    actions: list[NormalizationAction] = []
    for ordinal, cell in enumerate(normalized_cells):
        if "id" in cell:
            continue
        source_text = logical_source(cell)
        material = derive_cell_id_material(
            accepted_original_sha256_bytes=accepted_original_sha256_bytes,
            ordinal=ordinal,
            cell_type=cell["cell_type"],
            cell_source_text=source_text,
        )
        if material.cell_id in seen:
            raise CellIdError(
                "CELL_ID_GENERATED_COLLISION",
                f"generated ID for cell {ordinal} collides with another cell ID",
            )
        cell["id"] = material.cell_id
        seen.add(material.cell_id)
        actions.append(
            NormalizationAction(
                ordinal=ordinal,
                action="assigned_missing_cell_id",
                algorithm=ALGORITHM_ID,
                cell_id=material.cell_id,
                cell_source_sha256=material.cell_source_sha256_bytes.hex(),
            )
        )

    return normalized, tuple(actions)
