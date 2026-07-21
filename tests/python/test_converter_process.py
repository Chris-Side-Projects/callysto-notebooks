from __future__ import annotations

import ast
import copy
import json
import os
import stat
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from callysto_m0.converter_launcher import LauncherError, _validated_child_document


REPOSITORY_ROOT = Path(__file__).parents[2]
PACKAGE_DIRECTORY = REPOSITORY_ROOT / "python" / "callysto_m0"
LAUNCHER = REPOSITORY_ROOT / "python" / "callysto_m0" / "converter_launcher.py"
CONVERTER = REPOSITORY_ROOT / "python" / "callysto_m0" / "converter_cli.py"
FIXTURE = Path(__file__).parent / "fixtures" / "converter-process-sentinel.ipynb"
RESULT_SCHEMA_VERSION = "callysto.converter-process-result.v0"


def _canonical_json(document: object) -> bytes:
    return (
        json.dumps(document, ensure_ascii=False, separators=(",", ":"), sort_keys=True).encode(
            "utf-8"
        )
        + b"\n"
    )


def _valid_success_document() -> dict[str, object]:
    artifact_id = "a_" + "1" * 32
    return {
        "artifacts": [
            {
                "artifact_id": artifact_id,
                "byte_size": 68,
                "file": f"artifacts/{artifact_id}",
                "sha256": "2" * 64,
            }
        ],
        "isolation": {
            "environment_names": ["LANG", "LC_ALL", "TZ"],
            "evidence_level": "local_process_only",
            "inherited_file_descriptor_closed": True,
            "network_boundary": "not_enforced_by_os_or_container",
            "notebook_execution": "forbidden_and_not_invoked",
        },
        "manifest": {
            "byte_size": 1024,
            "file": "manifest.json",
            "sha256": "3" * 64,
        },
        "schema_version": RESULT_SCHEMA_VERSION,
        "status": "ok",
    }


def _valid_error_document() -> dict[str, object]:
    return {
        "error_code": "OUTPUT_DIRECTORY_NOT_EMPTY",
        "schema_version": RESULT_SCHEMA_VERSION,
        "status": "error",
    }


def _module_path(module_name: str) -> Path | None:
    if module_name == "callysto_m0":
        return PACKAGE_DIRECTORY / "__init__.py"
    if not module_name.startswith("callysto_m0."):
        return None
    relative_parts = module_name.split(".")[1:]
    module_path = PACKAGE_DIRECTORY.joinpath(*relative_parts).with_suffix(".py")
    if module_path.is_file():
        return module_path
    package_path = PACKAGE_DIRECTORY.joinpath(*relative_parts, "__init__.py")
    return package_path if package_path.is_file() else None


def _local_imports(module_name: str, tree: ast.AST) -> set[str]:
    imported_modules: set[str] = set()
    for node in ast.walk(tree):
        candidates: list[str] = []
        if isinstance(node, ast.Import):
            candidates.extend(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            if node.level:
                package_parts = module_name.split(".")[:-1]
                ascend = node.level - 1
                if ascend > len(package_parts):
                    continue
                base_parts = package_parts[: len(package_parts) - ascend]
                if node.module:
                    base_parts.extend(node.module.split("."))
                candidates.append(".".join(base_parts))
            elif node.module:
                candidates.append(node.module)
        for candidate in candidates:
            if _module_path(candidate) is not None:
                imported_modules.add(candidate)
    return imported_modules


def _converter_module_graph() -> dict[str, Path]:
    modules = {
        "callysto_m0": PACKAGE_DIRECTORY / "__init__.py",
        "callysto_m0.converter_cli": CONVERTER,
    }
    pending = list(modules)
    inspected: set[str] = set()
    while pending:
        module_name = pending.pop()
        if module_name in inspected:
            continue
        inspected.add(module_name)
        tree = ast.parse(modules[module_name].read_text(encoding="utf-8"))
        for imported_module in _local_imports(module_name, tree):
            if imported_module not in modules:
                module_path = _module_path(imported_module)
                assert module_path is not None
                modules[imported_module] = module_path
                pending.append(imported_module)
    return modules


class ConverterProcessProofTests(unittest.TestCase):
    @staticmethod
    def _injected_environment(*, marker_path: Path, secret: str) -> dict[str, str]:
        environment = os.environ.copy()
        environment.update(
            {
                "AWS_SECRET_ACCESS_KEY": f"aws-{secret}",
                "CALLYSTO_M0_CANARY_URL": f"http://127.0.0.1:9/{secret}",
                "CALLYSTO_M0_SENTINEL_PATH": str(marker_path),
                "CALLYSTO_M0_SENTINEL_SECRET": secret,
                "DATABASE_URL": f"postgresql://credential-{secret}@localhost/private",
            }
        )
        return environment

    def _run_converter(
        self,
        *,
        output_directory: Path,
        marker_path: Path,
        secret: str,
        inherited_file_descriptor: int,
    ) -> subprocess.CompletedProcess[bytes]:
        command = [
            sys.executable,
            "-B",
            str(LAUNCHER),
            "--input",
            str(FIXTURE),
            "--output-dir",
            str(output_directory),
            "--version-id",
            "sentinel-proof-v1",
            "--probe-fd",
            str(inherited_file_descriptor),
        ]
        return subprocess.run(
            command,
            check=False,
            env=self._injected_environment(marker_path=marker_path, secret=secret),
            pass_fds=(inherited_file_descriptor,),
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=30,
        )

    def _run_child_directly(
        self,
        *,
        output_directory: Path,
        marker_path: Path,
        secret: str,
        inherited_file_descriptor: int,
    ) -> subprocess.CompletedProcess[bytes]:
        command = [
            sys.executable,
            "-I",
            "-B",
            "-X",
            "utf8",
            str(CONVERTER),
            "--input",
            str(FIXTURE),
            "--output-dir",
            str(output_directory),
            "--version-id",
            "direct-child-proof-v1",
            "--probe-fd",
            str(inherited_file_descriptor),
        ]
        return subprocess.run(
            command,
            check=False,
            env=self._injected_environment(marker_path=marker_path, secret=secret),
            pass_fds=(inherited_file_descriptor,),
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=30,
        )

    def test_launcher_accepts_only_the_exact_success_child_schema(self) -> None:
        valid = _valid_success_document()
        self.assertEqual(_validated_child_document(_canonical_json(valid)), valid)

        malformed_documents: list[object] = []
        for mutation in (
            lambda document: document.update({"unexpected": True}),
            lambda document: document.pop("manifest"),
            lambda document: document["manifest"].update({"unexpected": True}),
            lambda document: document["manifest"].update({"byte_size": True}),
            lambda document: document["manifest"].update({"file": "../manifest.json"}),
            lambda document: document["manifest"].update({"sha256": "A" * 64}),
            lambda document: document["artifacts"][0].update({"file": "artifacts/wrong"}),
            lambda document: document["artifacts"][0].update({"byte_size": -1}),
            lambda document: document["isolation"].update({"environment_names": ["LANG"]}),
            lambda document: document["isolation"].update(
                {"inherited_file_descriptor_closed": 1}
            ),
            lambda document: document.update({"status": "error"}),
        ):
            document = copy.deepcopy(valid)
            mutation(document)
            malformed_documents.append(document)
        malformed_documents.extend(
            (
                [valid],
                {"schema_version": RESULT_SCHEMA_VERSION, "status": "ok"},
            )
        )

        for document in malformed_documents:
            with self.subTest(document=document), self.assertRaisesRegex(
                LauncherError, "CHILD_PROTOCOL_INVALID"
            ):
                _validated_child_document(_canonical_json(document))

        duplicate_status = (
            b'{"artifacts":[],"isolation":{},"manifest":{},'
            b'"schema_version":"callysto.converter-process-result.v0",'
            b'"status":"ok","status":"error"}\n'
        )
        with self.assertRaisesRegex(LauncherError, "CHILD_PROTOCOL_INVALID"):
            _validated_child_document(duplicate_status)

    def test_launcher_accepts_only_the_exact_error_child_schema(self) -> None:
        valid = _valid_error_document()
        self.assertEqual(_validated_child_document(_canonical_json(valid)), valid)

        malformed_documents: list[object] = []
        for mutation in (
            lambda document: document.update({"unexpected": True}),
            lambda document: document.pop("error_code"),
            lambda document: document.update({"error_code": "lowercase"}),
            lambda document: document.update({"error_code": True}),
            lambda document: document.update({"schema_version": "wrong"}),
            lambda document: document.update({"status": "ok"}),
        ):
            document = copy.deepcopy(valid)
            mutation(document)
            malformed_documents.append(document)

        for document in malformed_documents:
            with self.subTest(document=document), self.assertRaisesRegex(
                LauncherError, "CHILD_PROTOCOL_INVALID"
            ):
                _validated_child_document(_canonical_json(document))

        for malformed_bytes in (b"", b"null\n", b"NaN\n", b"{not-json}\n", b"\xff"):
            with self.subTest(payload=malformed_bytes), self.assertRaisesRegex(
                LauncherError, "CHILD_PROTOCOL_INVALID"
            ):
                _validated_child_document(malformed_bytes)

    def test_converter_process_is_deterministic_inert_and_secret_free(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_root:
            root = Path(temporary_root)
            output_a = root / "output-a"
            output_b = root / "output-b"
            output_a.mkdir()
            output_b.mkdir()
            marker_a = root / "marker-a-must-not-exist"
            marker_b = root / "marker-b-must-not-exist"
            secret_a = "sentinel-secret-alpha-7f0c"
            secret_b = "sentinel-secret-beta-9d2e"

            with tempfile.TemporaryFile() as inherited_file:
                file_descriptor = inherited_file.fileno()
                os.set_inheritable(file_descriptor, True)
                first = self._run_converter(
                    output_directory=output_a,
                    marker_path=marker_a,
                    secret=secret_a,
                    inherited_file_descriptor=file_descriptor,
                )
                second = self._run_converter(
                    output_directory=output_b,
                    marker_path=marker_b,
                    secret=secret_b,
                    inherited_file_descriptor=file_descriptor,
                )

            self.assertEqual(first.returncode, 0, first.stdout.decode("utf-8", errors="replace"))
            self.assertEqual(second.returncode, 0, second.stdout.decode("utf-8", errors="replace"))
            self.assertEqual(first.stderr, b"")
            self.assertEqual(second.stderr, b"")
            self.assertFalse(marker_a.exists())
            self.assertFalse(marker_b.exists())

            manifest_a = (output_a / "manifest.json").read_bytes()
            manifest_b = (output_b / "manifest.json").read_bytes()
            result_a = (output_a / "result.json").read_bytes()
            result_b = (output_b / "result.json").read_bytes()
            self.assertEqual(manifest_a, manifest_b)
            self.assertEqual(result_a, result_b)
            self.assertEqual(first.stdout, result_a)
            self.assertEqual(second.stdout, result_b)

            manifest = json.loads(manifest_a)
            result = json.loads(result_a)
            self.assertEqual(result["status"], "ok")
            self.assertEqual(result["isolation"]["evidence_level"], "local_process_only")
            self.assertEqual(
                result["isolation"]["network_boundary"],
                "not_enforced_by_os_or_container",
            )
            self.assertEqual(result["isolation"]["environment_names"], ["LANG", "LC_ALL", "TZ"])
            self.assertTrue(result["isolation"]["inherited_file_descriptor_closed"])
            self.assertEqual(result["isolation"]["notebook_execution"], "forbidden_and_not_invoked")
            self.assertEqual(manifest["contract"]["notebook_execution"], "forbidden")
            self.assertEqual(manifest["contract"]["network_access"], "forbidden")
            self.assertEqual(manifest["cells"][0]["outputs"][0]["presentation"], "placeholder")
            self.assertEqual(
                manifest["cells"][0]["id"], manifest["normalization_actions"][0]["cell_id"]
            )
            self.assertIn("CALLYSTO_M0_SENTINEL_PATH", manifest["cells"][0]["source"]["text"])

            all_output = b"".join(
                path.read_bytes()
                for directory in (output_a, output_b)
                for path in sorted(directory.rglob("*"))
                if path.is_file()
            ) + first.stdout + first.stderr + second.stdout + second.stderr
            forbidden_values = (
                secret_a,
                secret_b,
                f"aws-{secret_a}",
                f"aws-{secret_b}",
                str(marker_a),
                str(marker_b),
                f"postgresql://credential-{secret_a}@localhost/private",
                f"postgresql://credential-{secret_b}@localhost/private",
            )
            for forbidden_value in forbidden_values:
                with self.subTest(forbidden_value=forbidden_value):
                    self.assertNotIn(forbidden_value.encode("utf-8"), all_output)

            self.assertEqual(stat.S_IMODE((output_a / "manifest.json").stat().st_mode), 0o600)
            self.assertEqual(stat.S_IMODE((output_a / "result.json").stat().st_mode), 0o600)

    def test_nonempty_output_directory_fails_without_echoing_paths_or_secrets(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_root:
            root = Path(temporary_root)
            output_directory = root / "output"
            output_directory.mkdir()
            existing = output_directory / "existing-evidence"
            existing.write_text("preserve", encoding="utf-8")
            marker = root / "sensitive-marker-path"
            secret = "sentinel-secret-must-not-appear"

            with tempfile.TemporaryFile() as inherited_file:
                file_descriptor = inherited_file.fileno()
                os.set_inheritable(file_descriptor, True)
                completed = self._run_converter(
                    output_directory=output_directory,
                    marker_path=marker,
                    secret=secret,
                    inherited_file_descriptor=file_descriptor,
                )

            self.assertEqual(completed.returncode, 2)
            self.assertEqual(completed.stderr, b"")
            self.assertEqual(
                json.loads(completed.stdout),
                {
                    "error_code": "OUTPUT_DIRECTORY_NOT_EMPTY",
                    "schema_version": "callysto.converter-process-result.v0",
                    "status": "error",
                },
            )
            self.assertNotIn(secret.encode("utf-8"), completed.stdout)
            self.assertNotIn(str(marker).encode("utf-8"), completed.stdout)
            self.assertEqual(existing.read_text(encoding="utf-8"), "preserve")
            self.assertFalse((output_directory / "manifest.json").exists())

    def test_direct_child_scrubs_environment_and_closes_inherited_descriptor(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_root:
            root = Path(temporary_root)
            output_directory = root / "direct-child-output"
            output_directory.mkdir()
            marker_path = root / "direct-child-marker-must-not-exist"
            secret = "direct-child-secret-4a91"

            with tempfile.TemporaryFile() as inherited_file:
                file_descriptor = inherited_file.fileno()
                os.set_inheritable(file_descriptor, True)
                os.fstat(file_descriptor)
                completed = self._run_child_directly(
                    output_directory=output_directory,
                    marker_path=marker_path,
                    secret=secret,
                    inherited_file_descriptor=file_descriptor,
                )

            self.assertEqual(completed.returncode, 0, completed.stdout.decode(errors="replace"))
            self.assertEqual(completed.stderr, b"")
            self.assertFalse(marker_path.exists())
            result_bytes = (output_directory / "result.json").read_bytes()
            self.assertEqual(completed.stdout, result_bytes)
            result = json.loads(result_bytes)
            self.assertEqual(result["isolation"]["environment_names"], ["LANG", "LC_ALL", "TZ"])
            self.assertTrue(result["isolation"]["inherited_file_descriptor_closed"])

            all_output = b"".join(
                path.read_bytes()
                for path in sorted(output_directory.rglob("*"))
                if path.is_file()
            ) + completed.stdout + completed.stderr
            for forbidden_value in (
                secret,
                f"aws-{secret}",
                str(marker_path),
                f"postgresql://credential-{secret}@localhost/private",
            ):
                with self.subTest(forbidden_value=forbidden_value):
                    self.assertNotIn(forbidden_value.encode("utf-8"), all_output)

    def test_full_converter_module_graph_has_no_execution_subprocess_or_network_code_path(
        self,
    ) -> None:
        modules = _converter_module_graph()
        self.assertEqual(
            set(modules),
            {
                "callysto_m0",
                "callysto_m0.cell_ids",
                "callysto_m0.conversion",
                "callysto_m0.converter_cli",
            },
        )
        package_tree = ast.parse(modules["callysto_m0"].read_text(encoding="utf-8"))
        self.assertEqual(len(package_tree.body), 1)
        self.assertIsInstance(package_tree.body[0], ast.Expr)
        self.assertIsInstance(package_tree.body[0].value, ast.Constant)
        self.assertIsInstance(package_tree.body[0].value.value, str)

        forbidden_imports = {
            "asyncio",
            "ftplib",
            "http",
            "importlib",
            "jupyter_client",
            "nbclient",
            "nbconvert",
            "requests",
            "smtplib",
            "socket",
            "ssl",
            "subprocess",
            "urllib",
        }
        forbidden_calls = {"__import__", "compile", "eval", "exec"}
        forbidden_attribute_calls = {
            "execl",
            "execle",
            "execlp",
            "execlpe",
            "execv",
            "execve",
            "execvp",
            "execvpe",
            "fork",
            "forkpty",
            "popen",
            "posix_spawn",
            "posix_spawnp",
            "spawnl",
            "spawnle",
            "spawnlp",
            "spawnlpe",
            "spawnv",
            "spawnve",
            "spawnvp",
            "spawnvpe",
            "system",
        }
        for module_name, module_path in sorted(modules.items()):
            tree = ast.parse(module_path.read_text(encoding="utf-8"))
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    imported = {alias.name.split(".")[0] for alias in node.names}
                    self.assertFalse(imported & forbidden_imports, module_name)
                if isinstance(node, ast.ImportFrom) and node.module:
                    self.assertNotIn(node.module.split(".")[0], forbidden_imports, module_name)
                if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
                    self.assertNotIn(node.func.id, forbidden_calls, module_name)
                if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
                    self.assertNotIn(node.func.attr, forbidden_attribute_calls, module_name)


if __name__ == "__main__":
    unittest.main()
