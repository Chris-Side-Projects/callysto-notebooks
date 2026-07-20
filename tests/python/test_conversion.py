from __future__ import annotations

import ast
import base64
import inspect
import json
import socket
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import callysto_m0.conversion as conversion_module
from callysto_m0.conversion import ConversionError, ConversionPolicy, convert_notebook_bytes


def notebook_bytes(cells: list[dict[str, object]]) -> bytes:
    return json.dumps(
        {
            "cells": cells,
            "metadata": {"kernelspec": {"name": "python3"}, "language_info": {"name": "python"}},
            "nbformat": 4,
            "nbformat_minor": 5,
        },
        sort_keys=True,
    ).encode("utf-8")


class ConversionTests(unittest.TestCase):
    def test_cell_source_is_not_executed_and_marker_remains_absent(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            marker = Path(directory) / "would-exist-if-executed"
            source = notebook_bytes(
                [
                    {
                        "cell_type": "code",
                        "source": f"from pathlib import Path\nPath({str(marker)!r}).write_text('executed')",
                        "metadata": {},
                        "outputs": [],
                    }
                ]
            )
            result = convert_notebook_bytes(source, version_id="version-1")
            self.assertFalse(marker.exists())
            cell_source = result.manifest["cells"][0]["source"]
            self.assertEqual(cell_source["presentation"], "escaped_text")
            self.assertIn("write_text", cell_source["text"])
            self.assertEqual(result.manifest["contract"]["notebook_execution"], "forbidden")

    def test_converter_has_no_forbidden_execution_network_or_secret_imports(self) -> None:
        tree = ast.parse(inspect.getsource(conversion_module))
        forbidden_imports = {
            "subprocess",
            "socket",
            "urllib",
            "requests",
            "http",
            "os",
            "jupyter_client",
            "nbclient",
            "nbconvert",
        }
        forbidden_calls = {"eval", "exec", "compile", "__import__"}
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                self.assertFalse({alias.name.split(".")[0] for alias in node.names} & forbidden_imports)
            if isinstance(node, ast.ImportFrom) and node.module:
                self.assertNotIn(node.module.split(".")[0], forbidden_imports)
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
                self.assertNotIn(node.func.id, forbidden_calls)

    def test_remote_urls_are_data_and_no_socket_is_opened(self) -> None:
        source = notebook_bytes(
            [
                {
                    "cell_type": "markdown",
                    "source": "![remote](https://example.invalid/tracker.png)<script>alert(1)</script>",
                    "metadata": {},
                }
            ]
        )
        with mock.patch.object(socket, "socket", side_effect=AssertionError("network attempted")):
            result = convert_notebook_bytes(source, version_id="v")
        contract = result.manifest["cells"][0]["source"]
        self.assertEqual(contract["presentation"], "strict_markdown")
        self.assertFalse(contract["raw_html_allowed"])
        self.assertIn("<script>", contract["text"])

    def test_html_svg_and_widget_outputs_are_blocked_placeholders(self) -> None:
        for mime, value in (
            ("text/html", "<script>alert(1)</script>"),
            ("image/svg+xml", "<svg onload='alert(1)'></svg>"),
            ("application/vnd.jupyter.widget-view+json", {"model_id": "x"}),
        ):
            with self.subTest(mime=mime):
                source = notebook_bytes(
                    [
                        {
                            "cell_type": "code",
                            "source": "x",
                            "metadata": {},
                            "outputs": [{"output_type": "display_data", "data": {mime: value}, "metadata": {}}],
                        }
                    ]
                )
                result = convert_notebook_bytes(source, version_id="v")
                output = result.manifest["cells"][0]["outputs"][0]
                self.assertEqual(output["presentation"], "placeholder")
                self.assertIn(mime, output["blocked_mime_types"])
                self.assertEqual(result.artifacts, {})

    def test_valid_raster_becomes_typed_immutable_artifact(self) -> None:
        png = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
        )
        source = notebook_bytes(
            [
                {
                    "cell_type": "code",
                    "source": "plot()",
                    "metadata": {},
                    "outputs": [
                        {
                            "output_type": "display_data",
                            "data": {"image/png": base64.b64encode(png).decode("ascii")},
                            "metadata": {},
                        }
                    ],
                }
            ]
        )
        result = convert_notebook_bytes(source, version_id="v")
        output = result.manifest["cells"][0]["outputs"][0]
        self.assertEqual(output["presentation"], "immutable_raster")
        self.assertEqual(output["mime"], "image/png")
        self.assertEqual(result.artifacts[output["artifact_id"]], png)

    def test_mime_signature_disagreement_fails_closed(self) -> None:
        source = notebook_bytes(
            [
                {
                    "cell_type": "code",
                    "source": "x",
                    "metadata": {},
                    "outputs": [
                        {
                            "output_type": "display_data",
                            "data": {
                                "image/png": base64.b64encode(b"<script>alert(1)</script>").decode("ascii")
                            },
                            "metadata": {},
                        }
                    ],
                }
            ]
        )
        with self.assertRaisesRegex(ConversionError, "OUTPUT_MIME_MISMATCH"):
            convert_notebook_bytes(source, version_id="v")

    def test_conversion_is_canonical_for_same_input(self) -> None:
        source = notebook_bytes(
            [{"cell_type": "code", "source": "1 + 1", "metadata": {}, "outputs": []}]
        )
        first = convert_notebook_bytes(source, version_id="v")
        second = convert_notebook_bytes(source, version_id="v")
        self.assertEqual(first.canonical_manifest_bytes(), second.canonical_manifest_bytes())
        self.assertEqual(first.manifest_sha256(), second.manifest_sha256())

    def test_cell_id_binds_to_accepted_bytes_not_version_row_identifier(self) -> None:
        vector_path = Path(__file__).parents[2] / "contracts" / "callysto-cell-id-v1-vectors.json"
        vector_document = json.loads(vector_path.read_text(encoding="utf-8"))
        vector = next(item for item in vector_document["vectors"] if item["name"] == "ascii-code")
        source = base64.b64decode(vector["accepted_original_base64"], validate=True)
        first = convert_notebook_bytes(source, version_id="version-row-a")
        second = convert_notebook_bytes(source, version_id="version-row-b")
        self.assertEqual(first.manifest["cells"][0]["id"], vector["cell_id"])
        self.assertEqual(second.manifest["cells"][0]["id"], vector["cell_id"])
        self.assertEqual(
            first.manifest["accepted_original_sha256"], vector["accepted_original_sha256_hex"]
        )
        self.assertEqual(first.manifest["contract"]["cell_id_algorithm"], "callysto-cell-id-v1")

    def test_invalid_json_duplicate_keys_empty_cells_and_limits_fail_closed(self) -> None:
        with self.assertRaisesRegex(ConversionError, "NOTEBOOK_JSON_INVALID"):
            convert_notebook_bytes(b"{", version_id="v")
        with self.assertRaisesRegex(ConversionError, "JSON_DUPLICATE_KEY"):
            convert_notebook_bytes(
                b'{"cells":[],"cells":[],"metadata":{},"nbformat":4,"nbformat_minor":5}',
                version_id="v",
            )
        with self.assertRaisesRegex(ConversionError, "CELLS_EMPTY"):
            convert_notebook_bytes(
                b'{"cells":[],"metadata":{},"nbformat":4,"nbformat_minor":5}', version_id="v"
            )
        source = notebook_bytes(
            [{"cell_type": "code", "source": "x", "metadata": {}, "outputs": []}]
        )
        with self.assertRaisesRegex(ConversionError, "SOURCE_LIMIT_EXCEEDED"):
            convert_notebook_bytes(
                source,
                version_id="v",
                policy=ConversionPolicy(max_source_bytes=10),
            )

    def test_schema_document_and_manifest_contract_identifiers_match(self) -> None:
        schema_path = Path(__file__).parents[2] / "contracts" / "render-manifest-v0.schema.json"
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
        source = notebook_bytes(
            [{"cell_type": "raw", "source": "note", "metadata": {}}]
        )
        result = convert_notebook_bytes(source, version_id="v")
        self.assertEqual(schema["properties"]["schema_version"]["const"], result.manifest["schema_version"])
        self.assertTrue(set(schema["required"]).issubset(result.manifest))

    def test_checked_in_legacy_and_hostile_fixtures_follow_default_deny_contract(self) -> None:
        fixtures = Path(__file__).parent / "fixtures"
        legacy = convert_notebook_bytes(
            (fixtures / "legacy-no-ids.ipynb").read_bytes(), version_id="legacy-v1"
        )
        self.assertEqual(len(legacy.manifest["normalization_actions"]), 2)
        self.assertTrue(all(cell["id"] for cell in legacy.manifest["cells"]))

        hostile = convert_notebook_bytes(
            (fixtures / "hostile-active-output.ipynb").read_bytes(), version_id="hostile-v1"
        )
        self.assertEqual(hostile.manifest["cells"][0]["source"]["presentation"], "strict_markdown")
        self.assertFalse(hostile.manifest["cells"][0]["source"]["raw_html_allowed"])
        self.assertEqual(
            hostile.manifest["cells"][1]["outputs"][0]["presentation"], "placeholder"
        )
        self.assertEqual(hostile.artifacts, {})


if __name__ == "__main__":
    unittest.main()
