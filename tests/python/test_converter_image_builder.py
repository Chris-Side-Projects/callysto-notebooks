from __future__ import annotations

import importlib.util
import os
import re
import tarfile
import tempfile
import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
BUILDER_PATH = REPOSITORY_ROOT / "scripts" / "build-m0-converter-image.py"


def _load_builder():
    specification = importlib.util.spec_from_file_location(
        "callysto_converter_image_builder", BUILDER_PATH
    )
    if specification is None or specification.loader is None:
        raise RuntimeError("builder import unavailable")
    module = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(module)
    return module


class ConverterImageBuilderTests(unittest.TestCase):
    def test_source_provenance_matches_the_pinned_contract(self) -> None:
        builder = _load_builder()
        digest = builder._validate_source_provenance()
        self.assertRegex(digest, re.compile(r"^[0-9a-f]{64}$"))
        self.assertEqual(
            {
                source["kind"]: source["sha256"]
                for source in builder.EXPECTED_SOURCE_PROVENANCE["sources"]
            },
            {
                "base_rootfs": builder.EXPECTED_BASE_ROOTFS_SHA256,
                "python_runtime": builder.EXPECTED_PYTHON_ARCHIVE_SHA256,
            },
        )
        for source in builder.EXPECTED_SOURCE_PROVENANCE["sources"]:
            self.assertEqual(source["platform"], "linux-x86_64-musl")
            self.assertTrue(source["license"])
            self.assertRegex(source["license_source"], r"^https://")

    def test_preexisting_predictable_partial_symlink_is_never_followed(self) -> None:
        builder = _load_builder()
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            output = root / "converter-image.tar.gz"
            old_partial = output.with_suffix(output.suffix + ".partial")
            symlink_target = root / "must-not-be-overwritten"
            original_target_bytes = b"preserve-this-file"
            symlink_target.write_bytes(original_target_bytes)
            old_partial.symlink_to(symlink_target)
            layer = root / "layer.tar"
            layer.write_bytes(b"deterministic-layer")

            builder._write_image_archive(
                config_bytes=b'{"config":true}',
                config_name="config.json",
                layer_path=layer,
                manifest_bytes=b'[{"Config":"config.json"}]',
                output=output,
            )

            self.assertEqual(symlink_target.read_bytes(), original_target_bytes)
            self.assertTrue(old_partial.is_symlink())
            self.assertEqual(os.readlink(old_partial), str(symlink_target))
            self.assertTrue(output.is_file())
            with tarfile.open(output, "r:gz") as image:
                self.assertEqual(
                    sorted(image.getnames()),
                    ["config.json", "layer.tar", "manifest.json"],
                )
            self.assertEqual(
                list(root.glob(f".{output.name}.*")),
                [],
            )

    def test_exception_removes_private_output_and_preserves_existing_image(
        self,
    ) -> None:
        builder = _load_builder()
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            output = root / "converter-image.tar.gz"
            original_output_bytes = b"previous-valid-image"
            output.write_bytes(original_output_bytes)
            missing_layer = root / "missing-layer.tar"

            with self.assertRaises(FileNotFoundError):
                builder._write_image_archive(
                    config_bytes=b'{"config":true}',
                    config_name="config.json",
                    layer_path=missing_layer,
                    manifest_bytes=b'[{"Config":"config.json"}]',
                    output=output,
                )

            self.assertEqual(output.read_bytes(), original_output_bytes)
            self.assertEqual(
                list(root.glob(f".{output.name}.*")),
                [],
            )


if __name__ == "__main__":
    unittest.main()
