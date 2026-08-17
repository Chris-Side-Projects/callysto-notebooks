import { createHash, randomUUID } from "node:crypto";
import { constants as fileConstants } from "node:fs";
import { open, readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

import { APIError, Sandbox, Snapshot } from "@vercel/sandbox";

import {
  collectBoundedPaginator,
  deleteSandboxAfterSnapshotCleanup,
  deleteSnapshotsAfterCreationAttempt,
  deleteVerifiedSandbox,
  deleteVerifiedSnapshots,
  providerListSignal,
} from "./m0-vercel-resource-cleanup.mts";

/** @typedef {{projectId: string, teamId: string, token: string}} ProofAuth */
/** @typedef {import("@vercel/sandbox").Sandbox} SandboxInstance */
/** @typedef {import("@vercel/sandbox").Snapshot} SnapshotInstance */

// The SDK can emit raw command-stream diagnostics. The proof has an allowlisted
// stdout protocol and intentionally discards all stderr.
process.stderr.write = () => true;

const RESULT_SCHEMA_VERSION = "callysto.vercel-sandbox-proof.v0";
const MODE = process.argv[2];
const REQUIRED_AUTH_NAMES = [
  "VERCEL_PROJECT_ID",
  "VERCEL_TEAM_ID",
  "VERCEL_TOKEN",
];
const HOST_PATTERN =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const IMAGE_TAG = "callysto-m0-converter:proof";
const CONVERTER_IMAGE_PATH = "/private/tmp/callysto-m0-converter-image.tar.gz";
const CONVERTER_IMAGE_SHA256 =
  "cf0f56ff2dc6e312b14a38824399a1dcb19dd04a7ae9db02f546f2b33efa1fb7";
const CONVERTER_IMAGE_SIZE = 31_857_168;
const FIXTURE_SHA256 =
  "b3d98d16d91ecf1216b81306745e4e2ee5b21777172e06bb715b90bd051cc137";
const PROJECT_EXCLUSIVITY_MARKER = "callysto-m0-proof-exclusive-v1";
const DOCKER_BOOTSTRAP_SOURCE = "live-dnf-repository-unpinned";
const PROOF_EVIDENCE_LEVEL = "feasibility-only";
const TERMINAL_SANDBOX_STATES = new Set(["aborted", "failed", "stopped"]);

class ProofFailure extends Error {
  /** @param {string} code @param {boolean} cleanupSucceeded */
  constructor(code, cleanupSucceeded) {
    super(code);
    this.cleanupSucceeded = cleanupSucceeded;
  }
}

const SAFE_FAILURE_CODES = new Map([
  ["failed:conversion", "CONVERSION_FAILED"],
  ["failed:conversion-contract", "CONVERSION_CONTRACT_FAILED"],
  ["failed:converter-stage-bootstrap", "CONVERTER_BOOTSTRAP_STAGE_FAILED"],
  ["failed:converter-stage-execution", "CONVERTER_EXECUTION_STAGE_FAILED"],
  [
    "failed:converter-stage-image-upload",
    "CONVERTER_IMAGE_UPLOAD_STAGE_FAILED",
  ],
  [
    "failed:converter-stage-image-assembly",
    "CONVERTER_IMAGE_ASSEMBLY_STAGE_FAILED",
  ],
  ["failed:converter-stage-layout", "CONVERTER_LAYOUT_STAGE_FAILED"],
  [
    "failed:converter-stage-outer-network",
    "CONVERTER_OUTER_NETWORK_STAGE_FAILED",
  ],
  ["failed:converter-stage-image-load", "CONVERTER_IMAGE_LOAD_STAGE_FAILED"],
  [
    "failed:converter-stage-nested-boundary",
    "CONVERTER_NESTED_BOUNDARY_STAGE_FAILED",
  ],
  ["failed:converter-stage-conversion", "CONVERTER_CONVERSION_STAGE_FAILED"],
  ["failed:converter-stage-output", "CONVERTER_OUTPUT_STAGE_FAILED"],
  ["invalid:proof-output-size", "PROOF_OUTPUT_EMPTY_OR_OVERSIZED"],
  ["invalid:proof-output-json", "PROOF_OUTPUT_NOT_JSON"],
  ["invalid:proof-output-shape", "PROOF_OUTPUT_SHAPE_INVALID"],
  ["invalid:proof-output-canonical", "PROOF_OUTPUT_NOT_CANONICAL"],
  ["failed:converter-bootstrap", "CONVERTER_BOOTSTRAP_FAILED"],
  ["failed:docker-daemon", "DOCKER_DAEMON_FAILED"],
  ["failed:image-assembly", "IMAGE_ASSEMBLY_FAILED"],
  ["failed:image-load", "IMAGE_LOAD_FAILED"],
  ["failed:nested-boundary", "NESTED_BOUNDARY_FAILED"],
  ["failed:nested-boundary-probe", "NESTED_BOUNDARY_PROBE_FAILED"],
  ["failed:nested-docker-exit-1", "NESTED_DOCKER_EXIT_1"],
  ["failed:nested-docker-exit-2", "NESTED_DOCKER_EXIT_2"],
  ["failed:nested-docker-exit-125", "NESTED_DOCKER_EXIT_125"],
  ["failed:nested-docker-exit-126", "NESTED_DOCKER_EXIT_126"],
  ["failed:nested-docker-exit-127", "NESTED_DOCKER_EXIT_127"],
  ["failed:nested-docker-exit-137", "NESTED_DOCKER_EXIT_137"],
  ["failed:docker-smoke-baseline", "DOCKER_SMOKE_BASELINE_FAILED"],
  ["failed:docker-smoke-network", "DOCKER_SMOKE_NETWORK_NONE_FAILED"],
  ["failed:docker-smoke-read-only", "DOCKER_SMOKE_READ_ONLY_FAILED"],
  ["failed:docker-smoke-user", "DOCKER_SMOKE_NON_ROOT_FAILED"],
  ["failed:docker-smoke-privileges", "DOCKER_SMOKE_PRIVILEGE_DROP_FAILED"],
  ["failed:docker-smoke-mounts", "DOCKER_SMOKE_MOUNTS_FAILED"],
  ["failed:docker-smoke-pids", "DOCKER_SMOKE_PIDS_FAILED"],
  ["failed:nested-capabilities_dropped", "NESTED_CAPABILITIES_PRESENT"],
  ["failed:nested-dns_blocked", "NESTED_DNS_AVAILABLE"],
  ["failed:nested-environment_exact", "NESTED_ENVIRONMENT_NOT_EXACT"],
  ["failed:nested-input_readable", "NESTED_INPUT_NOT_READABLE"],
  ["failed:nested-input_read_only", "NESTED_INPUT_WRITABLE"],
  ["failed:nested-metadata_blocked", "NESTED_METADATA_REACHABLE"],
  ["failed:nested-no_new_privileges", "NESTED_PRIVILEGE_ESCALATION_ALLOWED"],
  ["failed:nested-output_listable", "NESTED_OUTPUT_NOT_LISTABLE"],
  ["failed:nested-output_writable", "NESTED_OUTPUT_NOT_WRITABLE"],
  ["failed:nested-public_ip_blocked", "NESTED_PUBLIC_IP_REACHABLE"],
  ["failed:nested-root_read_only", "NESTED_ROOT_WRITABLE"],
  ["failed:nested-uid_non_root", "NESTED_UID_IS_ROOT"],
  ["failed:notebook-execution", "NOTEBOOK_EXECUTION_DETECTED"],
  ["failed:outer-network-boundary", "OUTER_NETWORK_BOUNDARY_FAILED"],
  ["failed:outer-network-public-ip", "OUTER_NETWORK_PUBLIC_IP_REACHABLE"],
  ["failed:outer-network-probe", "OUTER_NETWORK_PROBE_FAILED"],
  ["failed:output-permissions", "OUTPUT_PERMISSIONS_FAILED"],
  ["failed:output-proof", "OUTPUT_PROOF_FAILED"],
  ["failed:provider-config", "PROVIDER_CONFIG_FAILED"],
  ["failed:snapshot", "SNAPSHOT_FAILED"],
  ["failed:snapshot-http-400", "SNAPSHOT_HTTP_400"],
  ["failed:snapshot-http-402", "SNAPSHOT_HTTP_402"],
  ["failed:snapshot-http-403", "SNAPSHOT_HTTP_403"],
  ["failed:snapshot-http-404", "SNAPSHOT_HTTP_404"],
  ["failed:snapshot-http-409", "SNAPSHOT_HTTP_409"],
  ["failed:snapshot-http-422", "SNAPSHOT_HTTP_422"],
  ["failed:snapshot-http-429", "SNAPSHOT_HTTP_429"],
  ["failed:network-boundary", "ORCHESTRATOR_NETWORK_BOUNDARY_FAILED"],
  ["failed:network-probe", "ORCHESTRATOR_NETWORK_PROBE_FAILED"],
]);

/** @param {unknown} error */
function safeProofFailureCode(error) {
  return error instanceof Error
    ? (SAFE_FAILURE_CODES.get(error.message) ?? "PROOF_FAILED")
    : "PROOF_FAILED";
}

/** @param {string} name */
function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value || value.trim() !== value) {
    throw new Error(`missing:${name}`);
  }
  return value;
}

function authentication() {
  const values = Object.fromEntries(
    REQUIRED_AUTH_NAMES.map((name) => [name, requiredEnvironment(name)]),
  );
  return {
    projectId: values.VERCEL_PROJECT_ID,
    teamId: values.VERCEL_TEAM_ID,
    token: values.VERCEL_TOKEN,
  };
}

/** @param {string} name */
function exactHostname(name) {
  const value = requiredEnvironment(name).toLowerCase();
  if (!HOST_PATTERN.test(value)) {
    throw new Error(`invalid:${name}`);
  }
  return value;
}

/** @param {string} name */
function exactPort(name) {
  const value = Number(requiredEnvironment(name));
  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    throw new Error(`invalid:${name}`);
  }
  return value;
}

function projectState() {
  const value = requiredEnvironment("CALLYSTO_VERCEL_PROJECT_STATE");
  if (!new Set(["created", "existing"]).has(value)) {
    throw new Error("invalid:CALLYSTO_VERCEL_PROJECT_STATE");
  }
  return value;
}

function assertProjectExclusive() {
  if (
    requiredEnvironment("CALLYSTO_VERCEL_PROJECT_EXCLUSIVE") !==
    PROJECT_EXCLUSIVITY_MARKER
  ) {
    throw new Error("invalid:CALLYSTO_VERCEL_PROJECT_EXCLUSIVE");
  }
}

/** @param {unknown} value @returns {unknown} */
function canonicalValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalValue(item));
  }
  if (value && typeof value === "object") {
    const record = /** @type {Record<string, unknown>} */ (value);
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, canonicalValue(record[key])]),
    );
  }
  return value;
}

/** @param {string} payload @param {readonly string[]} keys */
function parseExactJson(payload, keys) {
  if (
    typeof payload !== "string" ||
    payload.length === 0 ||
    payload.length > 1_048_576
  ) {
    throw new Error("invalid:proof-output-size");
  }
  let document;
  try {
    document = JSON.parse(payload);
  } catch {
    throw new Error("invalid:proof-output-json");
  }
  const actualKeys =
    document && typeof document === "object" && !Array.isArray(document)
      ? Object.keys(document)
      : [];
  if (
    !document ||
    typeof document !== "object" ||
    Array.isArray(document) ||
    actualKeys.length !== keys.length ||
    !keys.every((key) => actualKeys.includes(key))
  ) {
    throw new Error("invalid:proof-output-shape");
  }
  if (payload !== `${JSON.stringify(canonicalValue(document))}\n`) {
    throw new Error("invalid:proof-output-canonical");
  }
  return /** @type {Record<string, any>} */ (document);
}

/** @param {string} payload @param {RegExp} pattern */
function parseSafeLine(payload, pattern) {
  if (
    typeof payload !== "string" ||
    payload.length === 0 ||
    payload.length > 512 ||
    !payload.endsWith("\n")
  ) {
    throw new Error("failed:converter-bootstrap");
  }
  const match = payload.slice(0, -1).match(pattern);
  if (!match) {
    throw new Error("failed:converter-bootstrap");
  }
  return match;
}

/** @param {unknown} error @param {number} status */
function isApiStatus(error, status) {
  return error instanceof APIError && error.response?.status === status;
}

/**
 * @param {{auth: ProofAuth, name: string, sandbox?: SandboxInstance}} options
 */
async function deleteExactSandbox({ auth, name, sandbox }) {
  return deleteVerifiedSandbox({
    Sandbox,
    auth,
    isNotFound: (error) => isApiStatus(error, 404),
    name,
    observedSandbox: sandbox,
    terminalStates: TERMINAL_SANDBOX_STATES,
    wait: () => delay(500),
  });
}

/**
 * @param {{auth: ProofAuth, expectedSourceSessionId?: string, name: string, snapshot?: SnapshotInstance}} options
 */
async function deleteExactSnapshots({
  auth,
  expectedSourceSessionId,
  name,
  snapshot,
}) {
  return deleteVerifiedSnapshots({
    Snapshot,
    auth,
    expectedSourceSessionId,
    name,
    observedSnapshot: snapshot,
    wait: () => delay(500),
  });
}

async function openPinnedConverterImage() {
  let handle;
  try {
    handle = await open(
      CONVERTER_IMAGE_PATH,
      fileConstants.O_RDONLY | fileConstants.O_NOFOLLOW,
    );
    const metadata = await handle.stat();
    const currentUid = process.getuid?.();
    if (
      !metadata.isFile() ||
      currentUid === undefined ||
      metadata.uid !== currentUid ||
      (metadata.mode & 0o777) !== 0o600 ||
      metadata.size !== CONVERTER_IMAGE_SIZE
    ) {
      throw new Error("invalid:converter-image");
    }
    const digest = createHash("sha256");
    const buffer = Buffer.allocUnsafe(1024 * 1024);
    let position = 0;
    while (position < metadata.size) {
      const { bytesRead } = await handle.read(
        buffer,
        0,
        Math.min(buffer.length, metadata.size - position),
        position,
      );
      if (bytesRead === 0) {
        throw new Error("invalid:converter-image");
      }
      digest.update(buffer.subarray(0, bytesRead));
      position += bytesRead;
    }
    if (digest.digest("hex") !== CONVERTER_IMAGE_SHA256) {
      throw new Error("invalid:converter-image");
    }
    return { handle, size: metadata.size };
  } catch (error) {
    await handle?.close();
    throw error;
  }
}

/**
 * @param {SandboxInstance} sandbox
 * @param {{handle: import("node:fs/promises").FileHandle, size: number}} image
 */
async function uploadPinnedConverterImage(sandbox, image) {
  const chunkSize = 2 * 1024 * 1024;
  const buffer = Buffer.allocUnsafe(chunkSize);
  let position = 0;
  let part = 0;
  await sandbox.mkDir("image-parts");
  while (position < image.size) {
    const { bytesRead } = await image.handle.read(
      buffer,
      0,
      Math.min(buffer.length, image.size - position),
      position,
    );
    if (bytesRead === 0) {
      throw new Error("invalid:converter-image");
    }
    await sandbox.writeFiles([
      {
        content: Buffer.from(buffer.subarray(0, bytesRead)),
        mode: 0o400,
        path: `image-parts/part-${String(part).padStart(6, "0")}`,
      },
    ]);
    position += bytesRead;
    part += 1;
  }
  return part;
}

const converterNetworkProbe = String.raw`
import errno
import json
import socket

UNREACHABLE = {
    errno.EACCES,
    errno.EPERM,
    errno.ENETUNREACH,
    errno.EHOSTUNREACH,
    errno.ETIMEDOUT,
    errno.ECONNREFUSED,
    errno.ECONNRESET,
}

def unreachable(host, port):
    try:
        connection = socket.create_connection((host, port), timeout=2)
    except OSError as error:
        return error.errno in UNREACHABLE
    connection.close()
    return False

result = {
    "metadata_unreachable": unreachable("169.254.169.254", 80),
    "public_ip_unreachable": unreachable("1.1.1.1", 443),
}
print(json.dumps(result, separators=(",", ":"), sort_keys=True))
`;

const converterOutputProbe = String.raw`
import hashlib
import json
import os
import re
import stat
import sys
from pathlib import Path

EXPECTED_RESULT_KEYS = {"artifacts", "isolation", "manifest", "schema_version", "status"}
EXPECTED_ISOLATION_KEYS = {
    "environment_names",
    "evidence_level",
    "inherited_file_descriptor_closed",
    "network_boundary",
    "notebook_execution",
}
SHA256 = re.compile(r"^[0-9a-f]{64}$")

def unique_object(pairs):
    document = {}
    for key, value in pairs:
        if key in document:
            raise ValueError("duplicate")
        document[key] = value
    return document

def load_document(payload):
    return json.loads(payload, object_pairs_hook=unique_object)

def exact_regular_files(root):
    entries = list(root.iterdir())
    return (
        {entry.name for entry in entries} == {"manifest.json", "result.json"}
        and all(entry.is_file() and not entry.is_symlink() for entry in entries)
    )

def exact_modes(root):
    return all(
        stat.S_IMODE(path.stat().st_mode) == 0o600 and path.stat().st_uid == 65532
        for path in (root / "manifest.json", root / "result.json")
    )

root_a = Path("/vercel/sandbox/output-a")
root_b = Path("/vercel/sandbox/output-b")
result_a = (root_a / "result.json").read_bytes()
result_b = (root_b / "result.json").read_bytes()
manifest_a = (root_a / "manifest.json").read_bytes()
manifest_b = (root_b / "manifest.json").read_bytes()
document = load_document(result_a)
manifest = load_document(manifest_a)
isolation = document.get("isolation")
manifest_record = document.get("manifest")
cells = manifest.get("cells")
cell_ids = [cell.get("id") for cell in cells] if isinstance(cells, list) else []
all_output = result_a + result_b + manifest_a + manifest_b

result = {
    "canary_zero_hits": (
        Path("/vercel/sandbox/converter-canary-ready").is_file()
        and not Path("/vercel/sandbox/converter-canary-hits").exists()
    ),
    "deterministic_retry": result_a == result_b and manifest_a == manifest_b,
    "execution_marker_absent": all(
        not (root / "notebook-execution-marker").exists()
        for root in (root_a, root_b)
    ),
    "files_exact_and_regular": exact_regular_files(root_a) and exact_regular_files(root_b),
    "manifest_digest_verified": (
        isinstance(manifest_record, dict)
        and set(manifest_record) == {"byte_size", "file", "sha256"}
        and manifest_record.get("file") == "manifest.json"
        and manifest_record.get("byte_size") == len(manifest_a)
        and manifest_record.get("sha256") == hashlib.sha256(manifest_a).hexdigest()
    ),
    "manifest_policy_verified": (
        manifest.get("contract", {}).get("network_access") == "forbidden"
        and manifest.get("contract", {}).get("notebook_execution") == "forbidden"
        and len(cell_ids) == len(set(cell_ids))
        and all(isinstance(cell_id, str) and cell_id for cell_id in cell_ids)
    ),
    "no_sentinel_values": all(
        value not in all_output
        for value in (
            b"non-secret-proof-sentinel-alpha",
            b"non-secret-proof-sentinel-beta",
            b"must-not-reach-converter-alpha",
            b"must-not-reach-converter-beta",
        )
    ),
    "output_contract_verified": (
        isinstance(document, dict)
        and set(document) == EXPECTED_RESULT_KEYS
        and document.get("schema_version") == "callysto.converter-process-result.v0"
        and document.get("status") == "ok"
        and document.get("artifacts") == []
        and isinstance(isolation, dict)
        and set(isolation) == EXPECTED_ISOLATION_KEYS
        and isolation.get("environment_names") == ["LANG", "LC_ALL", "TZ"]
        and isolation.get("inherited_file_descriptor_closed") is True
        and isolation.get("notebook_execution") == "forbidden_and_not_invoked"
        and SHA256.fullmatch(manifest.get("accepted_original_sha256", "")) is not None
    ),
    "output_modes_verified": exact_modes(root_a) and exact_modes(root_b),
    "stdout_matches_result": (
        hashlib.sha256(result_a).hexdigest() == sys.argv[1]
        and hashlib.sha256(result_b).hexdigest() == sys.argv[2]
    ),
}
print(json.dumps(result, separators=(",", ":"), sort_keys=True))
raise SystemExit(0 if all(result.values()) else 2)
`;

const converterCanaryServer = String.raw`
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HITS = Path("/vercel/sandbox/converter-canary-hits")
READY = Path("/vercel/sandbox/converter-canary-ready")

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        with HITS.open("ab") as output:
            output.write(b"hit\n")
        self.send_response(204)
        self.end_headers()

    def log_message(self, format, *args):
        del format, args

server = ThreadingHTTPServer(("0.0.0.0", 38547), Handler)
READY.write_bytes(b"ready\n")
server.serve_forever()
`;

const converterCanaryPositiveControl = String.raw`
from urllib.request import urlopen

with urlopen("http://callysto-canary:38547/positive-control", timeout=2) as response:
    raise SystemExit(0 if response.status == 204 else 2)
`;

const converterCanaryResetProbe = String.raw`
import json
from pathlib import Path

hits = Path("/vercel/sandbox/converter-canary-hits")
positive_control = hits.is_file() and hits.read_bytes() == b"hit\n"
if positive_control:
    hits.unlink()
result = {
    "positive_control": positive_control,
    "reset_succeeded": not hits.exists(),
}
print(json.dumps(result, separators=(",", ":"), sort_keys=True))
raise SystemExit(0 if all(result.values()) else 2)
`;

const converterCanaryNetworkProbe = String.raw`
import errno
import json
import socket

DENIED = {
    errno.EACCES,
    errno.EPERM,
    errno.ENETUNREACH,
    errno.EHOSTUNREACH,
    errno.ETIMEDOUT,
}

attempted = True
try:
    connection = socket.create_connection(("callysto-canary", 38547), timeout=2)
except OSError as error:
    denied = error.errno in DENIED
else:
    try:
        connection.sendall(b"GET /nested-boundary HTTP/1.0\r\nHost: callysto-canary\r\n\r\n")
        connection.recv(128)
    finally:
        connection.close()
    denied = False

result = {"attempted": attempted, "denied": denied}
print(json.dumps(result, separators=(",", ":"), sort_keys=True))
raise SystemExit(0 if attempted and denied else 2)
`;

const converterCanaryZeroHitProbe = String.raw`
import json
from pathlib import Path

hits = Path("/vercel/sandbox/converter-canary-hits")
ready = Path("/vercel/sandbox/converter-canary-ready")
result = {"ready": ready.is_file(), "zero_hits": not hits.exists()}
print(json.dumps(result, separators=(",", ":"), sort_keys=True))
raise SystemExit(0 if all(result.values()) else 2)
`;

const imageAssemblyProbe = String.raw`
import hashlib
import json
import os
import sys
from pathlib import Path

expected_count = int(sys.argv[1])
expected_size = int(sys.argv[2])
expected_sha256 = sys.argv[3]
parts_root = Path("/vercel/sandbox/image-parts")
archive_path = Path("/vercel/sandbox/converter-image.tar.gz")
expected_names = [f"part-{index:06d}" for index in range(expected_count)]
parts = sorted(parts_root.iterdir(), key=lambda path: path.name)
parts_exact = (
    [part.name for part in parts] == expected_names
    and all(part.is_file() and not part.is_symlink() for part in parts)
)
digest = hashlib.sha256()
written = 0
with archive_path.open("xb") as destination:
    for part in parts:
        with part.open("rb") as source:
            while chunk := source.read(1024 * 1024):
                destination.write(chunk)
                digest.update(chunk)
                written += len(chunk)
    destination.flush()
    os.fsync(destination.fileno())
archive_path.chmod(0o400)
for part in parts:
    part.unlink()
parts_root.rmdir()
result = {
    "archive_digest_verified": digest.hexdigest() == expected_sha256,
    "archive_size_verified": written == expected_size,
    "parts_exact": parts_exact,
    "parts_removed": not parts_root.exists(),
}
print(json.dumps(result, separators=(",", ":"), sort_keys=True))
raise SystemExit(0 if all(result.values()) else 2)
`;

/**
 * @param {SandboxInstance} sandbox
 * @param {string} name
 * @param {"allow-all" | "deny-all"} networkPolicy
 */
function assertSandboxConfiguration(sandbox, name, networkPolicy) {
  if (
    sandbox.name !== name ||
    sandbox.persistent !== false ||
    sandbox.runtime !== "python3.13" ||
    sandbox.vcpus !== 1 ||
    sandbox.routes.length !== 0 ||
    sandbox.networkPolicy !== networkPolicy
  ) {
    throw new Error("failed:provider-config");
  }
}

/**
 * @param {SandboxInstance} sandbox
 * @param {string} name
 * @param {readonly string[]} hosts
 */
function assertOrchestratorConfiguration(sandbox, name, hosts) {
  const networkPolicy = sandbox.networkPolicy;
  const allowedHosts =
    networkPolicy &&
    typeof networkPolicy === "object" &&
    Array.isArray(networkPolicy.allow)
      ? [...networkPolicy.allow].sort()
      : [];
  if (
    sandbox.name !== name ||
    sandbox.persistent !== false ||
    sandbox.runtime !== "python3.13" ||
    sandbox.vcpus !== 1 ||
    sandbox.routes.length !== 0 ||
    allowedHosts.length !== hosts.length ||
    ![...hosts].sort().every((host, index) => host === allowedHosts[index])
  ) {
    throw new Error("failed:provider-config");
  }
}

/** @param {SandboxInstance} sandbox */
async function waitForDocker(sandbox) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const readiness = await sandbox.runCommand("docker", [
      "info",
      "--format",
      "{{.ServerVersion}}",
    ]);
    if (readiness.exitCode === 0) {
      return;
    }
    await delay(500);
  }
  throw new Error("failed:docker-daemon");
}

/**
 * @param {SandboxInstance} sandbox
 * @param {string[]} argumentsBeforeImage
 * @param {string} failure
 */
async function assertDockerLayer(sandbox, argumentsBeforeImage, failure) {
  const result = await sandbox.runCommand({
    args: [
      "run",
      "--rm",
      ...argumentsBeforeImage,
      IMAGE_TAG,
      "/opt/python/bin/python3",
      "-I",
      "-B",
      "-c",
      "raise SystemExit(0)",
    ],
    cmd: "docker",
    sudo: true,
  });
  if (result.exitCode !== 0) {
    throw new Error(failure);
  }
}

/** @param {SandboxInstance} sandbox */
async function assertConverterCanaryLiveness(sandbox) {
  const positiveControl = await sandbox.runCommand({
    args: [
      "run",
      "--rm",
      "--add-host",
      "callysto-canary:host-gateway",
      IMAGE_TAG,
      "/opt/python/bin/python3",
      "-I",
      "-B",
      "-c",
      converterCanaryPositiveControl,
    ],
    cmd: "docker",
    sudo: true,
  });
  if (positiveControl.exitCode !== 0) {
    throw new Error("failed:nested-boundary-probe");
  }
  const reset = await sandbox.runCommand("python3.13", [
    "-I",
    "-B",
    "-c",
    converterCanaryResetProbe,
  ]);
  if (reset.exitCode !== 0) {
    throw new Error("failed:nested-boundary-probe");
  }
  const resetResult = parseExactJson(await reset.stdout(), [
    "positive_control",
    "reset_succeeded",
  ]);
  if (!Object.values(resetResult).every((value) => value === true)) {
    throw new Error("failed:nested-boundary-probe");
  }
}

/** @param {SandboxInstance} sandbox */
async function assertConverterCanaryZeroHits(sandbox) {
  const zeroHitProbe = await sandbox.runCommand("python3.13", [
    "-I",
    "-B",
    "-c",
    converterCanaryZeroHitProbe,
  ]);
  if (zeroHitProbe.exitCode !== 0) {
    throw new Error("failed:nested-boundary-probe");
  }
  const zeroHitResult = parseExactJson(await zeroHitProbe.stdout(), [
    "ready",
    "zero_hits",
  ]);
  if (!Object.values(zeroHitResult).every((value) => value === true)) {
    throw new Error("failed:nested-boundary-probe");
  }
}

/** @param {ProofAuth} auth @param {string} retainedProjectState */
async function runConverterProof(auth, retainedProjectState) {
  const image = await openPinnedConverterImage();
  const proofHarnessSha256 = createHash("sha256")
    .update(await readFile(new URL(import.meta.url)))
    .digest("hex");
  let fixture;
  try {
    fixture = await readFile(
      new URL(
        "../tests/python/fixtures/converter-process-sentinel.ipynb",
        import.meta.url,
      ),
    );
    if (createHash("sha256").update(fixture).digest("hex") !== FIXTURE_SHA256) {
      throw new Error("invalid:converter-fixture");
    }
  } catch (error) {
    await image.handle.close();
    throw error;
  }

  const bootstrapName = `callysto-m0-bootstrap-${randomUUID()}`;
  const sandboxName = `callysto-m0-converter-${randomUUID()}`;
  /** @type {SandboxInstance | undefined} */
  let bootstrap;
  /** @type {SnapshotInstance | undefined} */
  let dockerSnapshot;
  let snapshotCreationAttempted = false;
  /** @type {SandboxInstance | undefined} */
  let sandbox;
  let proofError;
  let evidence;
  let dockerPackage;
  let dockerClientVersion;
  let dockerServerVersion;
  let converterStage = "bootstrap";
  try {
    bootstrap = await Sandbox.create({
      ...auth,
      env: {},
      name: bootstrapName,
      networkPolicy: "allow-all",
      persistent: false,
      resources: { vcpus: 1 },
      runtime: "python3.13",
      tags: { environment: "m0-proof", role: "converter-bootstrap" },
      timeout: 300_000,
    });
    assertSandboxConfiguration(bootstrap, bootstrapName, "allow-all");
    const install = await bootstrap.runCommand({
      args: ["install", "-y", "docker"],
      cmd: "dnf",
      sudo: true,
    });
    if (install.exitCode !== 0) {
      throw new Error("failed:converter-bootstrap");
    }
    const installed = await bootstrap.runCommand("rpm", [
      "-q",
      "--qf",
      "%{NAME}-%{EPOCHNUM}:%{VERSION}-%{RELEASE}.%{ARCH}\\n",
      "docker",
    ]);
    if (installed.exitCode !== 0) {
      throw new Error("failed:converter-bootstrap");
    }
    [, dockerPackage] = parseSafeLine(
      await installed.stdout(),
      /^(docker-[A-Za-z0-9.+:~_-]{1,160})$/,
    );
    try {
      snapshotCreationAttempted = true;
      dockerSnapshot = await bootstrap.snapshot();
    } catch (error) {
      const status = error instanceof APIError ? error.response.status : null;
      if (
        status !== null &&
        new Set([400, 402, 403, 404, 409, 422, 429]).has(status)
      ) {
        throw new Error(`failed:snapshot-http-${status}`);
      }
      throw new Error("failed:snapshot");
    }

    sandbox = await Sandbox.create({
      ...auth,
      env: {},
      name: sandboxName,
      networkPolicy: "deny-all",
      persistent: false,
      resources: { vcpus: 1 },
      source: { snapshotId: dockerSnapshot.snapshotId, type: "snapshot" },
      tags: { environment: "m0-proof", role: "converter" },
      timeout: 180_000,
    });
    converterStage = "execution";
    assertSandboxConfiguration(sandbox, sandboxName, "deny-all");
    await sandbox.runCommand({
      args: ["--host=unix:///var/run/docker.sock"],
      cmd: "dockerd",
      detached: true,
      sudo: true,
    });
    await waitForDocker(sandbox);
    const dockerVersion = await sandbox.runCommand("docker", [
      "version",
      "--format",
      "{{.Client.Version}}|{{.Server.Version}}",
    ]);
    if (dockerVersion.exitCode !== 0) {
      throw new Error("failed:docker-daemon");
    }
    [, dockerClientVersion, dockerServerVersion] = parseSafeLine(
      await dockerVersion.stdout(),
      /^([0-9][A-Za-z0-9.+_-]{0,63})\|([0-9][A-Za-z0-9.+_-]{0,63})$/,
    );

    await sandbox.mkDir("input");
    await sandbox.mkDir("output-a");
    await sandbox.mkDir("output-b");
    converterStage = "image-upload";
    const imagePartCount = await uploadPinnedConverterImage(sandbox, image);
    await sandbox.writeFiles([
      { content: fixture, mode: 0o400, path: "input/source.ipynb" },
    ]);
    converterStage = "image-assembly";
    const imageAssembly = await sandbox.runCommand("python3.13", [
      "-I",
      "-B",
      "-c",
      imageAssemblyProbe,
      String(imagePartCount),
      String(CONVERTER_IMAGE_SIZE),
      CONVERTER_IMAGE_SHA256,
    ]);
    if (imageAssembly.exitCode !== 0) {
      throw new Error("failed:image-assembly");
    }
    const imageAssemblyResult = parseExactJson(await imageAssembly.stdout(), [
      "archive_digest_verified",
      "archive_size_verified",
      "parts_exact",
      "parts_removed",
    ]);
    if (!Object.values(imageAssemblyResult).every((value) => value === true)) {
      throw new Error("failed:image-assembly");
    }
    converterStage = "layout";
    const ownership = await sandbox.runCommand({
      args: [
        "65532:65532",
        "input",
        "input/source.ipynb",
        "output-a",
        "output-b",
      ],
      cmd: "chown",
      sudo: true,
    });
    const inputPermissions = await sandbox.runCommand({
      args: ["0500", "input"],
      cmd: "chmod",
      sudo: true,
    });
    const outputPermissions = await sandbox.runCommand({
      args: ["0700", "output-a", "output-b"],
      cmd: "chmod",
      sudo: true,
    });
    if (
      ownership.exitCode !== 0 ||
      inputPermissions.exitCode !== 0 ||
      outputPermissions.exitCode !== 0
    ) {
      throw new Error("failed:output-permissions");
    }
    await sandbox.runCommand({
      args: ["-I", "-B", "-c", converterCanaryServer],
      cmd: "python3.13",
      detached: true,
    });
    let canaryReady = false;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const readiness = await sandbox.runCommand("test", [
        "-f",
        "/vercel/sandbox/converter-canary-ready",
      ]);
      if (readiness.exitCode === 0) {
        canaryReady = true;
        break;
      }
      await delay(250);
    }
    if (!canaryReady) {
      throw new Error("failed:converter-bootstrap");
    }

    converterStage = "outer-network";
    const outerNetwork = await sandbox.runCommand("python3.13", [
      "-I",
      "-B",
      "-c",
      converterNetworkProbe,
    ]);
    if (outerNetwork.exitCode !== 0) {
      throw new Error("failed:outer-network-probe");
    }
    const outerNetworkResult = parseExactJson(await outerNetwork.stdout(), [
      "metadata_unreachable",
      "public_ip_unreachable",
    ]);
    const outerMetadataUnreachable =
      outerNetworkResult.metadata_unreachable === true;
    if (outerNetworkResult.public_ip_unreachable !== true) {
      throw new Error("failed:outer-network-public-ip");
    }

    converterStage = "image-load";
    const load = await sandbox.runCommand({
      args: ["load", "--input", "converter-image.tar.gz"],
      cmd: "docker",
      sudo: true,
    });
    if (load.exitCode !== 0) {
      throw new Error("failed:image-load");
    }

    await assertConverterCanaryLiveness(sandbox);

    await assertDockerLayer(sandbox, [], "failed:docker-smoke-baseline");
    const networkArguments = ["--network", "none"];
    await assertDockerLayer(
      sandbox,
      networkArguments,
      "failed:docker-smoke-network",
    );
    const readOnlyArguments = [
      ...networkArguments,
      "--read-only",
      "--tmpfs",
      "/tmp:rw,noexec,nosuid,size=64m",
    ];
    await assertDockerLayer(
      sandbox,
      readOnlyArguments,
      "failed:docker-smoke-read-only",
    );
    const userArguments = [...readOnlyArguments, "--user", "65532:65532"];
    await assertDockerLayer(sandbox, userArguments, "failed:docker-smoke-user");
    const privilegeArguments = [
      ...userArguments,
      "--cap-drop",
      "ALL",
      "--security-opt",
      "no-new-privileges",
    ];
    await assertDockerLayer(
      sandbox,
      privilegeArguments,
      "failed:docker-smoke-privileges",
    );
    const mountArguments = [
      ...privilegeArguments,
      "--mount",
      "type=bind,src=/vercel/sandbox/input,dst=/input,readonly",
      "--mount",
      "type=bind,src=/vercel/sandbox/output-a,dst=/output",
    ];
    await assertDockerLayer(
      sandbox,
      mountArguments,
      "failed:docker-smoke-mounts",
    );
    const pidsArguments = [...mountArguments, "--pids-limit", "64"];
    await assertDockerLayer(sandbox, pidsArguments, "failed:docker-smoke-pids");
    /** @param {string} outputDirectory */
    const hardenedDockerArguments = (outputDirectory) => [
      "run",
      "--rm",
      "--network",
      "none",
      "--read-only",
      "--user",
      "65532:65532",
      "--cap-drop",
      "ALL",
      "--security-opt",
      "no-new-privileges",
      "--pids-limit",
      "64",
      "--add-host",
      "callysto-canary:host-gateway",
      "--tmpfs",
      "/tmp:rw,noexec,nosuid,size=64m",
      "--mount",
      "type=bind,src=/vercel/sandbox/input,dst=/input,readonly",
      "--mount",
      `type=bind,src=/vercel/sandbox/${outputDirectory},dst=/output`,
    ];
    converterStage = "nested-boundary";
    const nestedCanary = await sandbox.runCommand({
      args: [
        ...hardenedDockerArguments("output-a"),
        IMAGE_TAG,
        "/opt/python/bin/python3",
        "-I",
        "-B",
        "-c",
        converterCanaryNetworkProbe,
      ],
      cmd: "docker",
      sudo: true,
    });
    const nestedCanaryResult = parseExactJson(await nestedCanary.stdout(), [
      "attempted",
      "denied",
    ]);
    if (
      nestedCanary.exitCode !== 0 ||
      nestedCanaryResult.attempted !== true ||
      nestedCanaryResult.denied !== true
    ) {
      throw new Error("failed:nested-boundary-probe");
    }
    await assertConverterCanaryZeroHits(sandbox);
    await assertConverterCanaryLiveness(sandbox);
    const boundary = await sandbox.runCommand({
      args: [
        ...hardenedDockerArguments("output-a"),
        IMAGE_TAG,
        "/opt/python/bin/python3",
        "-I",
        "-B",
        "/opt/callysto/boundary_probe.py",
      ],
      cmd: "docker",
      sudo: true,
    });
    const boundaryStdout = await boundary.stdout();
    if (
      boundaryStdout.length === 0 &&
      new Set([1, 2, 125, 126, 127, 137]).has(boundary.exitCode)
    ) {
      throw new Error(`failed:nested-docker-exit-${boundary.exitCode}`);
    }
    const boundaryResult = parseExactJson(boundaryStdout, [
      "address_space_limited",
      "capabilities_dropped",
      "cpu_time_limited",
      "dns_blocked",
      "environment_exact",
      "input_readable",
      "input_read_only",
      "metadata_blocked",
      "no_new_privileges",
      "output_listable",
      "output_writable",
      "public_ip_blocked",
      "root_read_only",
      "uid_non_root",
    ]);
    const failedBoundary = Object.entries(boundaryResult).find(
      ([, value]) => value !== true,
    );
    if (failedBoundary) {
      throw new Error(`failed:nested-${failedBoundary[0]}`);
    }
    if (boundary.exitCode !== 0) {
      throw new Error("failed:nested-boundary-probe");
    }

    const activeSandbox = sandbox;
    /** @param {string} outputDirectory @param {string} suffix */
    converterStage = "conversion";
    const runConversion = (outputDirectory, suffix) =>
      activeSandbox.runCommand({
        args: [
          ...hardenedDockerArguments(outputDirectory),
          "--env",
          "CALLYSTO_M0_CANARY_URL=https://example.com/must-not-run",
          "--env",
          "CALLYSTO_M0_SENTINEL_PATH=/output/execution-marker",
          "--env",
          `CALLYSTO_M0_SENTINEL_SECRET=non-secret-proof-sentinel-${suffix}`,
          "--env",
          `DATABASE_URL=must-not-reach-converter-${suffix}`,
          IMAGE_TAG,
          "/bin/sh",
          "-c",
          "exec 9</input/source.ipynb; exec /opt/python/bin/python3 -B /opt/callysto/python/callysto_m0/converter_launcher.py --input /input/source.ipynb --output-dir /output --version-id vercel-container-proof-v1 --probe-fd 9",
        ],
        cmd: "docker",
        sudo: true,
      });
    const conversionA = await runConversion("output-a", "alpha");
    const conversionB = await runConversion("output-b", "beta");
    if (conversionA.exitCode !== 0 || conversionB.exitCode !== 0) {
      throw new Error("failed:conversion");
    }
    const conversionAStdout = await conversionA.stdout();
    const conversionBStdout = await conversionB.stdout();
    const conversionResult = parseExactJson(conversionAStdout, [
      "artifacts",
      "isolation",
      "manifest",
      "schema_version",
      "status",
    ]);
    if (
      conversionResult.status !== "ok" ||
      conversionResult.isolation?.environment_names?.join("\n") !==
        "LANG\nLC_ALL\nTZ" ||
      conversionResult.isolation?.notebook_execution !==
        "forbidden_and_not_invoked"
    ) {
      throw new Error("failed:conversion-contract");
    }
    parseExactJson(conversionBStdout, [
      "artifacts",
      "isolation",
      "manifest",
      "schema_version",
      "status",
    ]);
    converterStage = "output";
    const outputProof = await sandbox.runCommand({
      args: [
        "-I",
        "-B",
        "-c",
        converterOutputProbe,
        createHash("sha256").update(conversionAStdout).digest("hex"),
        createHash("sha256").update(conversionBStdout).digest("hex"),
      ],
      cmd: "python3.13",
      sudo: true,
    });
    if (outputProof.exitCode !== 0) {
      throw new Error("failed:output-proof");
    }
    const outputResult = parseExactJson(await outputProof.stdout(), [
      "canary_zero_hits",
      "deterministic_retry",
      "execution_marker_absent",
      "files_exact_and_regular",
      "manifest_digest_verified",
      "manifest_policy_verified",
      "no_sentinel_values",
      "output_contract_verified",
      "output_modes_verified",
      "stdout_matches_result",
    ]);
    if (!Object.values(outputResult).every((value) => value === true)) {
      throw new Error("failed:output-proof");
    }
    evidence = {
      bootstrap_input_or_secrets_present: false,
      canary_liveness_checks: 2,
      canary_positive_control: true,
      canary_zero_hits: true,
      canary_zero_hits_after_denied_attempt: true,
      capabilities_dropped: true,
      conversion_succeeded: true,
      converter_environment_names: ["LANG", "LC_ALL", "TZ"],
      deterministic_retry: true,
      docker_bootstrap_reproducible: false,
      docker_bootstrap_source: DOCKER_BOOTSTRAP_SOURCE,
      docker_client_version: dockerClientVersion,
      docker_package: dockerPackage,
      docker_server_version: dockerServerVersion,
      docker_snapshot_bootstrap: true,
      evidence_level: PROOF_EVIDENCE_LEVEL,
      execution_marker_absent: true,
      image_archive_sha256: CONVERTER_IMAGE_SHA256,
      fixture_sha256: FIXTURE_SHA256,
      input_readable: true,
      input_read_only: true,
      manifest_and_output_digests_verified: true,
      outer_metadata_endpoint_tcp_reachable: !outerMetadataUnreachable,
      nested_container: true,
      nested_canary_attempted: true,
      nested_canary_blocked: true,
      network_policy: "deny-all",
      no_new_privileges: true,
      notebook_execution: "forbidden_and_not_invoked",
      outer_public_ip_unreachable: true,
      persistent: false,
      project_exclusive: true,
      proof_harness_sha256: proofHarnessSha256,
      project_state: retainedProjectState,
      resource_limits:
        "outer-1-vcpu-inner-512m-address-space-64-pids-30-cpu-seconds-180s",
      root_read_only: true,
      runtime: "python3.14.6",
      sentinel_values_absent: true,
      uid: 65_532,
    };
  } catch (error) {
    proofError =
      error instanceof Error && SAFE_FAILURE_CODES.has(error.message)
        ? error
        : new Error(`failed:converter-stage-${converterStage}`);
  }

  let imageHandleCloseSucceeded = true;
  try {
    await image.handle.close();
  } catch {
    imageHandleCloseSucceeded = false;
  }

  const sandboxCleanupSucceeded = await deleteExactSandbox({
    auth,
    name: sandboxName,
    sandbox,
  });
  const snapshotCleanupSucceeded = await deleteSnapshotsAfterCreationAttempt({
    creationAttempted: snapshotCreationAttempted,
    deleteSnapshots: (snapshot) =>
      deleteExactSnapshots({
        auth,
        name: bootstrapName,
        snapshot,
      }),
    observedSnapshot: dockerSnapshot,
  });
  const bootstrapCleanupSucceeded = await deleteSandboxAfterSnapshotCleanup({
    deleteSandbox: () =>
      deleteExactSandbox({
        auth,
        name: bootstrapName,
        sandbox: bootstrap,
      }),
    snapshotsCleaned: snapshotCleanupSucceeded,
  });
  const cleanupSucceeded =
    imageHandleCloseSucceeded &&
    sandboxCleanupSucceeded &&
    snapshotCleanupSucceeded &&
    bootstrapCleanupSucceeded;
  if (proofError || !cleanupSucceeded || !evidence) {
    throw new ProofFailure(
      cleanupSucceeded
        ? safeProofFailureCode(proofError)
        : "SANDBOX_CLEANUP_FAILED",
      cleanupSucceeded,
    );
  }
  return {
    bootstrap_cleanup_succeeded: true,
    cleanup_succeeded: true,
    snapshot_cleanup_succeeded: true,
    ...evidence,
  };
}

const orchestratorNetworkProbe = String.raw`
import errno
import http.client
import json
import socket
import ssl
import struct
import sys

postgres_host, postgres_port, r2_host = sys.argv[1], int(sys.argv[2]), sys.argv[3]
DENIED = {errno.EACCES, errno.EPERM, errno.ENETUNREACH, errno.EHOSTUNREACH}

def denied_connect(host, port):
    try:
        connection = socket.create_connection((host, port), timeout=2)
    except OSError as error:
        return error.errno in DENIED
    connection.close()
    return False

def denied_dns():
    try:
        socket.getaddrinfo("example.com", 443)
    except socket.gaierror as error:
        return error.errno == socket.EAI_NONAME
    return False

def postgres_tls():
    connection = socket.create_connection((postgres_host, postgres_port), timeout=5)
    try:
        connection.sendall(struct.pack("!II", 8, 80877103))
        if connection.recv(1) != b"S":
            return False
        context = ssl.create_default_context()
        secured = context.wrap_socket(connection, server_hostname=postgres_host)
        secured.close()
        return True
    finally:
        connection.close()

def r2_https():
    connection = http.client.HTTPSConnection(r2_host, 443, timeout=5)
    try:
        connection.request("HEAD", "/")
        return 100 <= connection.getresponse().status <= 599
    finally:
        connection.close()

result = {
    "disallowed_dns_denied": denied_dns(),
    "disallowed_ip_denied": denied_connect("1.1.1.1", 443),
    "metadata_denied": denied_connect("169.254.169.254", 80),
    "postgres_tls_reachable": postgres_tls(),
    "r2_https_reachable": r2_https(),
}
print(json.dumps(result, separators=(",", ":"), sort_keys=True))
`;

/** @param {ProofAuth} auth @param {string} retainedProjectState */
async function runOrchestratorProof(auth, retainedProjectState) {
  const postgresHost = exactHostname("CALLYSTO_PROOF_POSTGRES_HOST");
  const postgresPort = exactPort("CALLYSTO_PROOF_POSTGRES_PORT");
  const r2Host = exactHostname("CALLYSTO_PROOF_R2_HOST");
  const sandboxName = `callysto-m0-orchestrator-${randomUUID()}`;
  /** @type {SandboxInstance | undefined} */
  let sandbox;
  let proofError;
  let evidence;
  try {
    sandbox = await Sandbox.create({
      ...auth,
      env: {},
      name: sandboxName,
      networkPolicy: { allow: [postgresHost, r2Host] },
      persistent: false,
      resources: { vcpus: 1 },
      runtime: "python3.13",
      tags: { environment: "m0-proof", role: "orchestrator" },
      timeout: 120_000,
    });
    assertOrchestratorConfiguration(sandbox, sandboxName, [
      postgresHost,
      r2Host,
    ]);
    const probe = await sandbox.runCommand("python3.13", [
      "-I",
      "-B",
      "-c",
      orchestratorNetworkProbe,
      postgresHost,
      String(postgresPort),
      r2Host,
    ]);
    if (probe.exitCode !== 0) {
      throw new Error("failed:network-probe");
    }
    const result = parseExactJson(await probe.stdout(), [
      "disallowed_dns_denied",
      "disallowed_ip_denied",
      "metadata_denied",
      "postgres_tls_reachable",
      "r2_https_reachable",
    ]);
    if (!Object.values(result).every((value) => value === true)) {
      throw new Error("failed:network-boundary");
    }
    evidence = {
      allowed_destination_count: 2,
      disallowed_dns_denied: true,
      disallowed_ip_denied: true,
      metadata_denied: true,
      evidence_level: "two-host-reachability-only",
      network_policy: "two-host-default-deny-reachability",
      persistent: false,
      postgres_tls_reachable: true,
      project_state: retainedProjectState,
      r2_https_reachable: true,
      runtime: "python3.13",
    };
  } catch (error) {
    proofError = error;
  }
  const cleanupSucceeded = await deleteExactSandbox({
    auth,
    name: sandboxName,
    sandbox,
  });
  if (proofError || !cleanupSucceeded || !evidence) {
    throw new ProofFailure(
      cleanupSucceeded
        ? safeProofFailureCode(proofError)
        : "SANDBOX_CLEANUP_FAILED",
      cleanupSucceeded,
    );
  }
  return { cleanup_succeeded: true, ...evidence };
}

/** @param {ProofAuth} auth @param {string} retainedProjectState */
async function reconcileProofResources(auth, retainedProjectState) {
  let reconcileStage = "list-sandboxes";
  try {
    const listedSandboxes = await Sandbox.list({
      ...auth,
      signal: providerListSignal(),
    });
    const allSandboxes = await collectBoundedPaginator(
      listedSandboxes,
      "sandboxes",
    );
    if (
      allSandboxes.some(
        (candidate) => !candidate.name.startsWith("callysto-m0-"),
      )
    ) {
      reconcileStage = "assert-project-exclusive";
      throw new Error("failed:project-not-exclusive");
    }
    const sandboxes = allSandboxes.filter((candidate) =>
      candidate.name.startsWith("callysto-m0-"),
    );
    let sandboxCleanupSucceeded = true;
    let snapshotCount = 0;
    for (const candidate of sandboxes) {
      reconcileStage = "delete-sandbox-snapshots";
      const listedSnapshots = await Snapshot.list({
        ...auth,
        name: candidate.name,
        signal: providerListSignal(),
      });
      snapshotCount += (
        await collectBoundedPaginator(listedSnapshots, "snapshots")
      ).filter((snapshot) => snapshot.status === "created").length;
      const snapshotsCleaned = await deleteExactSnapshots({
        auth,
        expectedSourceSessionId: candidate.currentSessionId,
        name: candidate.name,
      });
      reconcileStage = "delete-sandboxes";
      const sandboxCleaned = await deleteSandboxAfterSnapshotCleanup({
        deleteSandbox: () =>
          deleteExactSandbox({
            auth,
            name: candidate.name,
          }),
        snapshotsCleaned,
      });
      sandboxCleanupSucceeded &&= snapshotsCleaned && sandboxCleaned;
    }

    reconcileStage = "list-snapshots";
    const projectSnapshots = await Snapshot.list({
      ...auth,
      signal: providerListSignal(),
    });
    const unownedCreatedSnapshots = (
      await collectBoundedPaginator(projectSnapshots, "snapshots")
    ).filter((candidate) => candidate.status === "created");
    if (unownedCreatedSnapshots.length !== 0) {
      reconcileStage = "assert-no-unowned-snapshots";
      throw new Error("failed:unowned-snapshot");
    }
    await delay(500);
    reconcileStage = "verify-sandboxes";
    const reconciledSandboxes = await Sandbox.list({
      ...auth,
      signal: providerListSignal(),
    });
    const sandboxAbsent =
      (await collectBoundedPaginator(reconciledSandboxes, "sandboxes"))
        .length === 0;
    reconcileStage = "verify-snapshots";
    const reconciledSnapshots = await Snapshot.list({
      ...auth,
      signal: providerListSignal(),
    });
    const snapshotAbsent = !(
      await collectBoundedPaginator(reconciledSnapshots, "snapshots")
    ).some((candidate) => candidate.status === "created");
    if (!sandboxCleanupSucceeded || !sandboxAbsent || !snapshotAbsent) {
      throw new ProofFailure("SANDBOX_CLEANUP_FAILED", false);
    }
    return {
      cleanup_succeeded: true,
      project_exclusive: true,
      project_state: retainedProjectState,
      sandboxes_reconciled: sandboxes.length,
      snapshots_reconciled: snapshotCount,
    };
  } catch (error) {
    if (error instanceof ProofFailure) {
      throw error;
    }
    let errorCode =
      {
        "delete-sandbox-snapshots": "RECONCILE_SANDBOX_SNAPSHOTS_FAILED",
        "delete-sandboxes": "RECONCILE_SANDBOXES_FAILED",
        "assert-no-unowned-snapshots": "RECONCILE_UNOWNED_SNAPSHOTS_PRESENT",
        "assert-project-exclusive": "RECONCILE_PROJECT_NOT_EXCLUSIVE",
        "list-sandboxes": "RECONCILE_SANDBOX_LIST_FAILED",
        "list-snapshots": "RECONCILE_SNAPSHOT_LIST_FAILED",
        "verify-sandboxes": "RECONCILE_SANDBOX_VERIFY_FAILED",
        "verify-snapshots": "RECONCILE_SNAPSHOT_VERIFY_FAILED",
      }[reconcileStage] ?? "SANDBOX_CLEANUP_FAILED";
    const apiStatus = error instanceof APIError ? error.response.status : null;
    if (
      apiStatus !== null &&
      new Set([400, 401, 402, 403, 404, 409, 429, 500, 502, 503, 504]).has(
        apiStatus,
      )
    ) {
      errorCode = `${errorCode}_HTTP_${apiStatus}`;
    }
    throw new ProofFailure(errorCode, false);
  }
}

let stage = "input";
let retainedProjectState = "unknown";
try {
  if (!new Set(["converter", "orchestrator", "reconcile"]).has(MODE)) {
    throw new Error("invalid:mode");
  }
  const auth = authentication();
  assertProjectExclusive();
  retainedProjectState = projectState();
  stage = "sandbox";
  const evidence =
    MODE === "converter"
      ? await runConverterProof(auth, retainedProjectState)
      : MODE === "orchestrator"
        ? await runOrchestratorProof(auth, retainedProjectState)
        : await reconcileProofResources(auth, retainedProjectState);
  process.stdout.write(
    `${JSON.stringify({
      evidence,
      mode: MODE,
      provider: "vercel-sandbox",
      schema_version: RESULT_SCHEMA_VERSION,
      status: "ok",
    })}\n`,
  );
} catch (error) {
  const safeInputError =
    error instanceof Error &&
    (error.message.startsWith("missing:") ||
      error.message.startsWith("invalid:"));
  process.stdout.write(
    `${JSON.stringify({
      cleanup_succeeded:
        error instanceof ProofFailure ? error.cleanupSucceeded : null,
      error_code: safeInputError
        ? "PROOF_INPUT_INVALID"
        : error instanceof ProofFailure
          ? error.message
          : "PROOF_FAILED",
      mode: new Set(["converter", "orchestrator", "reconcile"]).has(MODE)
        ? MODE
        : "unknown",
      project_state: retainedProjectState,
      schema_version: RESULT_SCHEMA_VERSION,
      stage,
      status: "error",
    })}\n`,
  );
  process.exitCode = 1;
}
