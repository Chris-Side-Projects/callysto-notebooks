from __future__ import annotations

import base64
import copy
import hashlib
import json
import unittest
from pathlib import Path
from unittest import mock

from callysto_m0.cell_ids import (
    ALGORITHM_ID,
    CellIdError,
    derive_cell_id_material,
    is_valid_cell_id,
    logical_source,
    normalize_notebook_cell_ids,
)


VECTOR_PATH = Path(__file__).parents[2] / "contracts" / "callysto-cell-id-v1-vectors.json"


def vectors() -> dict[str, object]:
    return json.loads(VECTOR_PATH.read_text(encoding="utf-8"))


class CellIdTests(unittest.TestCase):
    def test_normative_end_to_end_vectors_match_every_intermediate_byte(self) -> None:
        document = vectors()
        self.assertEqual(document["algorithm"], ALGORITHM_ID)
        for vector in document["vectors"]:
            with self.subTest(vector=vector["name"]):
                accepted_bytes = base64.b64decode(vector["accepted_original_base64"], validate=True)
                self.assertEqual(len(accepted_bytes), vector["accepted_original_byte_length"])
                accepted_digest = hashlib.sha256(accepted_bytes).digest()
                self.assertEqual(accepted_digest.hex(), vector["accepted_original_sha256_hex"])

                notebook = json.loads(accepted_bytes.decode("utf-8"))
                cell = notebook["cells"][vector["cell_ordinal"]]
                self.assertEqual(cell["cell_type"], vector["cell_type"])
                expected_kind = "array" if isinstance(cell["source"], list) else "string"
                self.assertEqual(expected_kind, vector["cell_source_input_kind"])
                source_text = logical_source(cell)
                self.assertEqual(source_text, vector["cell_source_text"])

                material = derive_cell_id_material(
                    accepted_original_sha256_bytes=accepted_digest,
                    ordinal=vector["cell_ordinal"],
                    cell_type=vector["cell_type"],
                    cell_source_text=source_text,
                )
                self.assertEqual(material.cell_source_utf8.hex(), vector["cell_source_utf8_hex"])
                self.assertEqual(
                    material.cell_source_sha256_bytes.hex(), vector["cell_source_sha256_hex"]
                )
                self.assertEqual(material.payload.hex(), vector["payload_hex"])
                self.assertEqual(material.id_digest.hex(), vector["id_digest_hex"])
                self.assertEqual(material.cell_id, vector["cell_id"])
                self.assertEqual(len(material.cell_id), 56)
                self.assertTrue(is_valid_cell_id(material.cell_id))

    def test_normative_ordinal_and_type_variants(self) -> None:
        document = vectors()
        by_name = {vector["name"]: vector for vector in document["vectors"]}
        parent = by_name[document["derivation_variants"]["accepted_original_from_vector"]]
        accepted = base64.b64decode(parent["accepted_original_base64"], validate=True)
        digest = hashlib.sha256(accepted).digest()

        observed: set[str] = set()
        for vector in document["derivation_variants"]["vectors"]:
            with self.subTest(vector=vector["name"]):
                material = derive_cell_id_material(
                    accepted_original_sha256_bytes=digest,
                    ordinal=vector["cell_ordinal"],
                    cell_type=vector["cell_type"],
                    cell_source_text=vector["cell_source_text"],
                )
                self.assertEqual(material.cell_source_utf8.hex(), vector["cell_source_utf8_hex"])
                self.assertEqual(
                    material.cell_source_sha256_bytes.hex(), vector["cell_source_sha256_hex"]
                )
                self.assertEqual(material.payload.hex(), vector["payload_hex"])
                self.assertEqual(material.id_digest.hex(), vector["id_digest_hex"])
                self.assertEqual(material.cell_id, vector["cell_id"])
                observed.add(material.cell_id)
        self.assertEqual(len(observed), 4)

    def test_binary_digest_is_normative_and_ascii_hex_negative_vector_is_rejected(self) -> None:
        document = vectors()
        negative = document["negative_vectors"][0]
        positive = next(
            vector for vector in document["vectors"] if vector["name"] == negative["based_on_vector"]
        )
        accepted = base64.b64decode(positive["accepted_original_base64"], validate=True)
        material = derive_cell_id_material(
            accepted_original_sha256_bytes=hashlib.sha256(accepted).digest(),
            ordinal=positive["cell_ordinal"],
            cell_type=positive["cell_type"],
            cell_source_text=positive["cell_source_text"],
        )
        self.assertEqual(material.cell_id, negative["correct_cell_id"])
        self.assertNotEqual(material.cell_id, negative["incorrect_cell_id"])
        with self.assertRaisesRegex(CellIdError, "ACCEPTED_ORIGINAL_DIGEST_INVALID"):
            derive_cell_id_material(
                accepted_original_sha256_bytes=positive["accepted_original_sha256_hex"].encode("ascii"),
                ordinal=positive["cell_ordinal"],
                cell_type=positive["cell_type"],
                cell_source_text=positive["cell_source_text"],
            )

    def test_array_and_string_sources_share_logical_hash_but_not_end_to_end_id(self) -> None:
        document = vectors()
        by_name = {vector["name"]: vector for vector in document["vectors"]}
        array = by_name["source-array"]
        string = by_name["source-string"]
        self.assertEqual(array["cell_source_text"], string["cell_source_text"])
        self.assertEqual(array["cell_source_sha256_hex"], string["cell_source_sha256_hex"])
        self.assertNotEqual(array["accepted_original_sha256_hex"], string["accepted_original_sha256_hex"])
        self.assertNotEqual(array["cell_id"], string["cell_id"])

    def test_nfc_and_nfd_are_not_normalized(self) -> None:
        document = vectors()
        by_name = {vector["name"]: vector for vector in document["vectors"]}
        nfc = by_name["unicode-nfc-markdown"]
        nfd = by_name["unicode-nfd-markdown"]
        self.assertNotEqual(nfc["cell_source_utf8_hex"], nfd["cell_source_utf8_hex"])
        self.assertNotEqual(nfc["cell_source_sha256_hex"], nfd["cell_source_sha256_hex"])
        self.assertNotEqual(nfc["cell_id"], nfd["cell_id"])

    def test_missing_ids_are_generated_on_copy_and_valid_existing_ids_are_preserved(self) -> None:
        notebook = {
            "cells": [
                {"cell_type": "markdown", "source": "missing"},
                {"id": "author_cell-1", "cell_type": "code", "source": "print(1)", "outputs": []},
            ]
        }
        original = copy.deepcopy(notebook)
        accepted_digest = hashlib.sha256(b"exact accepted original fixture").digest()
        normalized, actions = normalize_notebook_cell_ids(
            notebook, accepted_original_sha256_bytes=accepted_digest
        )
        self.assertEqual(notebook, original)
        self.assertEqual(normalized["cells"][1]["id"], "author_cell-1")
        self.assertTrue(normalized["cells"][0]["id"].startswith("cly_"))
        self.assertEqual(len(actions), 1)
        self.assertEqual(actions[0].algorithm, ALGORITHM_ID)

    def test_invalid_and_duplicate_supplied_ids_fail_closed(self) -> None:
        digest = hashlib.sha256(b"accepted").digest()
        with self.assertRaisesRegex(CellIdError, "CELL_ID_INVALID"):
            normalize_notebook_cell_ids(
                {"cells": [{"id": "bad id", "cell_type": "code", "source": ""}]},
                accepted_original_sha256_bytes=digest,
            )
        with self.assertRaisesRegex(CellIdError, "CELL_ID_DUPLICATE"):
            normalize_notebook_cell_ids(
                {
                    "cells": [
                        {"id": "same", "cell_type": "code", "source": "a"},
                        {"id": "same", "cell_type": "code", "source": "b"},
                    ]
                },
                accepted_original_sha256_bytes=digest,
            )

    def test_generated_collision_is_terminal_and_has_no_retry(self) -> None:
        existing_id = "cly_" + "a" * 52
        notebook = {
            "cells": [
                {"id": existing_id, "cell_type": "code", "source": "existing"},
                {"cell_type": "markdown", "source": "missing"},
            ]
        }
        digest = hashlib.sha256(b"accepted").digest()
        real_material = derive_cell_id_material(
            accepted_original_sha256_bytes=digest,
            ordinal=1,
            cell_type="markdown",
            cell_source_text="missing",
        )
        forced = type(real_material)(
            accepted_original_sha256_bytes=real_material.accepted_original_sha256_bytes,
            ordinal=real_material.ordinal,
            cell_type=real_material.cell_type,
            cell_source_utf8=real_material.cell_source_utf8,
            cell_source_sha256_bytes=real_material.cell_source_sha256_bytes,
            payload=real_material.payload,
            id_digest=real_material.id_digest,
            cell_id=existing_id,
        )
        with mock.patch("callysto_m0.cell_ids.derive_cell_id_material", return_value=forced) as derive:
            with self.assertRaisesRegex(CellIdError, "CELL_ID_GENERATED_COLLISION"):
                normalize_notebook_cell_ids(
                    notebook, accepted_original_sha256_bytes=digest
                )
        derive.assert_called_once()


if __name__ == "__main__":
    unittest.main()
