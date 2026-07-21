from __future__ import annotations

import importlib.util
import os
import subprocess
import sys
import unittest
import urllib.request
from pathlib import Path
from unittest import mock


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
LAUNCHER_PATH = REPOSITORY_ROOT / "scripts" / "run-m0-vercel-sandbox-proof.py"


def _load_launcher():
    specification = importlib.util.spec_from_file_location(
        "callysto_vercel_proof_launcher", LAUNCHER_PATH
    )
    if specification is None or specification.loader is None:
        raise RuntimeError("launcher import unavailable")
    module = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(module)
    return module


class VercelProofLauncherTests(unittest.TestCase):
    def test_url_opener_disables_ambient_proxies(self) -> None:
        launcher = _load_launcher()
        proxy_handlers = [
            handler
            for handler in launcher.URL_OPENER.handlers
            if isinstance(handler, urllib.request.ProxyHandler)
        ]
        self.assertEqual(proxy_handlers, [])

    def test_process_boundary_closes_inherited_descriptors(self) -> None:
        program = """
import importlib.util
import os
import sys

path = sys.argv[1]
specification = importlib.util.spec_from_file_location("proof_launcher", path)
module = importlib.util.module_from_spec(specification)
specification.loader.exec_module(module)
descriptor = os.open(os.devnull, os.O_RDONLY)
os.set_inheritable(descriptor, True)
module._restrict_inherited_process_state()
try:
    os.fstat(descriptor)
except OSError:
    print("closed")
else:
    print("open")
"""
        environment = {
            "LANG": "C",
            "LC_ALL": "C",
            "PATH": "/usr/bin:/bin",
            "TZ": "UTC",
        }
        completed = subprocess.run(
            [sys.executable, "-I", "-B", "-c", program, str(LAUNCHER_PATH)],
            check=False,
            close_fds=True,
            env=environment,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=10,
        )
        self.assertEqual(completed.returncode, 0)
        self.assertEqual(completed.stdout, b"closed\n")
        self.assertEqual(completed.stderr, b"")

    def test_process_boundary_reopens_preclosed_standard_error(self) -> None:
        program = """
import importlib.util
import os
import sys

os.close(2)
path = sys.argv[1]
specification = importlib.util.spec_from_file_location("proof_launcher", path)
module = importlib.util.module_from_spec(specification)
specification.loader.exec_module(module)
module._restrict_inherited_process_state()
try:
    os.fstat(2)
except OSError:
    print("closed")
else:
    print("open")
"""
        completed = subprocess.run(
            [sys.executable, "-I", "-B", "-c", program, str(LAUNCHER_PATH)],
            check=False,
            close_fds=True,
            env={"LANG": "C", "LC_ALL": "C", "PATH": "/usr/bin:/bin", "TZ": "UTC"},
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=10,
        )
        self.assertEqual(completed.returncode, 0)
        self.assertEqual(completed.stdout, b"open\n")

    def test_node_runtime_is_fixed_and_digest_pinned(self) -> None:
        launcher = _load_launcher()
        self.assertEqual(
            launcher.EXPECTED_NODE_PATH,
            Path(
                "/private/tmp/callysto-runtime-v24.18.0-py3.14.6/node/bin/node"
            ),
        )
        self.assertRegex(launcher.EXPECTED_NODE_SHA256, r"^[0-9a-f]{64}$")
        self.assertRegex(launcher.EXPECTED_NODE_ARCHIVE_SHA256, r"^[0-9a-f]{64}$")

    def test_project_resolution_accepts_only_exact_unlinked_empty_project(self) -> None:
        launcher = _load_launcher()
        response = {
            "env": [],
            "id": "prj_abc123",
            "link": None,
            "name": launcher.EXPECTED_PROJECT_NAME,
        }
        with mock.patch.object(launcher, "_request", return_value=(200, response)):
            self.assertEqual(
                launcher._resolve_project(
                    "token",
                    "team_abc123",
                    launcher.EXPECTED_PROJECT_NAME,
                    create=False,
                ),
                ("prj_abc123", "existing"),
            )

        for unsafe_project in (
            {**response, "link": {"type": "github"}},
            {**response, "env": [{"key": "UNEXPECTED"}]},
        ):
            with self.subTest(project=unsafe_project):
                with mock.patch.object(
                    launcher, "_request", return_value=(200, unsafe_project)
                ):
                    with self.assertRaises(launcher.LauncherError) as raised:
                        launcher._resolve_project(
                            "token",
                            "team_abc123",
                            launcher.EXPECTED_PROJECT_NAME,
                            create=False,
                        )
                    self.assertEqual(
                        raised.exception.code, "VERCEL_PROJECT_NOT_EXCLUSIVE"
                    )

    def test_project_exclusivity_requires_zero_deployments(self) -> None:
        launcher = _load_launcher()
        with mock.patch.object(
            launcher, "_request", return_value=(200, {"deployments": []})
        ):
            launcher._assert_project_has_no_deployments(
                "token", "team_abc123", "prj_abc123"
            )

        with mock.patch.object(
            launcher,
            "_request",
            return_value=(200, {"deployments": [{"uid": "dpl_abc123"}]}),
        ):
            with self.assertRaises(launcher.LauncherError) as raised:
                launcher._assert_project_has_no_deployments(
                    "token", "team_abc123", "prj_abc123"
                )
            self.assertEqual(raised.exception.code, "VERCEL_PROJECT_NOT_EXCLUSIVE")

    def test_exec_forwards_exclusivity_marker_without_ambient_state(self) -> None:
        launcher = _load_launcher()
        node = Path("/private/tmp/callysto-test-node/bin/node")
        with (
            mock.patch.object(launcher, "_restrict_inherited_process_state"),
            mock.patch.object(
                launcher.os, "execve", side_effect=RuntimeError("exec intercepted")
            ) as execute,
            self.assertRaisesRegex(RuntimeError, "exec intercepted"),
        ):
            launcher._exec_proof(
                node,
                "token",
                "team_abc123",
                "prj_abc123",
                "existing",
                "reconcile",
            )
        environment = execute.call_args.args[2]
        self.assertEqual(
            environment["CALLYSTO_VERCEL_PROJECT_EXCLUSIVE"],
            launcher.EXPECTED_PROJECT_EXCLUSIVITY_MARKER,
        )
        self.assertEqual(
            set(environment),
            {
                "CALLYSTO_VERCEL_PROJECT_EXCLUSIVE",
                "CALLYSTO_VERCEL_PROJECT_STATE",
                "LANG",
                "LC_ALL",
                "PATH",
                "TZ",
                "VERCEL_PROJECT_ID",
                "VERCEL_TEAM_ID",
                "VERCEL_TOKEN",
            },
        )


if __name__ == "__main__":
    unittest.main()
