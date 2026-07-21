import { readFile } from "node:fs/promises";

import { describe, expect, it, vi } from "vitest";

import {
  deleteSandboxAfterSnapshotCleanup,
  deleteSnapshotsAfterCreationAttempt,
  deleteVerifiedSandbox,
  deleteVerifiedSnapshots,
} from "../../scripts/m0-vercel-resource-cleanup.mts";

const proofScript = await readFile(
  new URL("../../scripts/m0-vercel-sandbox-proof.mjs", import.meta.url),
  "utf8",
);

describe("Vercel Sandbox M0 proof harness", () => {
  it("keeps the converter ephemeral and deny-all", () => {
    expect(proofScript).toContain('networkPolicy: "allow-all"');
    expect(proofScript).toContain('networkPolicy: "deny-all"');
    expect(proofScript).toContain("persistent: false");
    expect(proofScript).toContain('runtime: "python3.13"');
    expect(proofScript).toContain("await bootstrap.snapshot");
    expect(proofScript).toContain(
      'source: { snapshotId: dockerSnapshot.snapshotId, type: "snapshot" }',
    );
    expect(proofScript).toContain("deleteVerifiedSandbox({");
    expect(proofScript).toContain("deleteVerifiedSnapshots({");
    expect(proofScript).toContain('"--network"');
    expect(proofScript).toContain('"none"');
    expect(proofScript).toContain('"--read-only"');
    expect(proofScript).toContain('"no-new-privileges"');
    expect(proofScript).toContain('"65532:65532"');
    expect(proofScript).toContain('"input_readable"');
    expect(proofScript).toContain('"output_listable"');
    expect(proofScript).toContain('"canary_zero_hits"');
    expect(proofScript).toContain("converter-canary-ready");
    expect(proofScript).toContain("converter-canary-hits");
    expect(
      proofScript.match(/await assertConverterCanaryLiveness\(sandbox\);/g),
    ).toHaveLength(2);
    expect(proofScript).toContain("nestedCanaryResult.attempted !== true");
    expect(proofScript).toContain("nestedCanaryResult.denied !== true");
    expect(proofScript).toContain(
      "await assertConverterCanaryZeroHits(sandbox)",
    );
    expect(proofScript).toContain(
      "canary_zero_hits_after_denied_attempt: true",
    );
  });

  it("accepts only the fixed builder image and verifies deterministic output", () => {
    expect(proofScript).toContain(
      'const CONVERTER_IMAGE_PATH = "/private/tmp/callysto-m0-converter-image.tar.gz"',
    );
    expect(proofScript).toContain("fileConstants.O_NOFOLLOW");
    expect(proofScript).not.toContain("CALLYSTO_CONVERTER_IMAGE_TAR");
    expect(proofScript).not.toContain("CALLYSTO_CONVERTER_IMAGE_SHA256");
    expect(proofScript).toContain('"deterministic_retry"');
    expect(proofScript).toContain('"execution_marker_absent"');
    expect(proofScript).toContain(
      'isolation.get("inherited_file_descriptor_closed") is True',
    );
    expect(proofScript).toContain("--probe-fd 9");
    expect(proofScript).toContain('"manifest_digest_verified"');
    expect(proofScript).toContain('"stdout_matches_result"');
  });

  it("labels the live Docker bootstrap as feasibility-only", () => {
    expect(proofScript).toContain("docker_package:");
    expect(proofScript).toContain("docker_client_version:");
    expect(proofScript).toContain("docker_server_version:");
    expect(proofScript).toContain("docker_bootstrap_reproducible: false");
    expect(proofScript).toContain(
      'const DOCKER_BOOTSTRAP_SOURCE = "live-dnf-repository-unpinned"',
    );
    expect(proofScript).toContain(
      'const PROOF_EVIDENCE_LEVEL = "feasibility-only"',
    );
    expect(proofScript).toContain("proof_harness_sha256:");
  });

  it("reconciles named proof resources but never deletes an unowned snapshot", () => {
    expect(proofScript).toContain("assertProjectExclusive();");
    expect(proofScript).toContain(
      'const PROJECT_EXCLUSIVITY_MARKER = "callysto-m0-proof-exclusive-v1"',
    );
    expect(proofScript).toContain("name: candidate.name");
    expect(proofScript).toContain(
      "const projectSnapshots = await Snapshot.list(auth)",
    );
    expect(proofScript).toContain(
      'reconcileStage = "assert-no-unowned-snapshots"',
    );
    expect(proofScript).toContain('throw new Error("failed:unowned-snapshot")');
    const reconcileBody = proofScript.slice(
      proofScript.indexOf("async function reconcileProofResources"),
    );
    expect(reconcileBody).not.toContain("snapshotId: candidate.id");
    expect(proofScript).toContain(
      "const sandboxAbsent = (await reconciledSandboxes.toArray()).length === 0",
    );
    expect(proofScript).toContain("project_exclusive: true");
  });

  it("refuses mismatched Sandbox identities before any destructive call", async () => {
    const auth = {
      projectId: "project_test",
      teamId: "team_test",
      token: "test-token",
    };
    const name = "callysto-m0-converter-abc";
    const get = vi.fn();
    const mismatch = await deleteVerifiedSandbox({
      Sandbox: { get },
      auth,
      isNotFound: () => false,
      name,
      observedSandbox: { name: "callysto-m0-converter-foreign" },
      terminalStates: new Set(["stopped"]),
      wait: async () => undefined,
    });
    expect(mismatch).toBe(false);
    expect(get).not.toHaveBeenCalled();

    const stop = vi.fn(async () => undefined);
    const deleteSandbox = vi.fn(async () => undefined);
    get.mockResolvedValue({
      delete: deleteSandbox,
      name: "callysto-m0-converter-foreign",
      status: "running",
      stop,
    });
    const wrongLookup = await deleteVerifiedSandbox({
      Sandbox: { get },
      auth,
      isNotFound: () => false,
      name,
      observedSandbox: { name },
      terminalStates: new Set(["stopped"]),
      wait: async () => undefined,
    });
    expect(wrongLookup).toBe(false);
    expect(stop).not.toHaveBeenCalled();
    expect(deleteSandbox).not.toHaveBeenCalled();
  });

  it("deletes snapshots only after identities agree and gates Sandbox deletion", async () => {
    const auth = {
      projectId: "project_test",
      teamId: "team_test",
      token: "test-token",
    };
    const name = "callysto-m0-bootstrap-abc";
    const observedSnapshot = {
      snapshotId: "snapshot_expected",
      sourceSessionId: "session_expected",
      status: "created",
    } as const;
    const paginator = (
      values: Array<{
        id: string;
        sourceSessionId: string;
        status: string;
      }>,
    ) => ({ toArray: async () => values });
    const get = vi.fn();
    const list = vi.fn().mockResolvedValue(
      paginator([
        {
          id: "snapshot_foreign",
          sourceSessionId: "session_foreign",
          status: "created",
        },
      ]),
    );
    const mismatch = await deleteVerifiedSnapshots({
      Snapshot: { get, list },
      auth,
      name,
      observedSnapshot,
      wait: async () => undefined,
    });
    expect(mismatch).toBe(false);
    expect(get).not.toHaveBeenCalled();

    const candidate = {
      id: observedSnapshot.snapshotId,
      sourceSessionId: observedSnapshot.sourceSessionId,
      status: "created",
    };
    const foreignCandidate = {
      id: "snapshot_foreign",
      sourceSessionId: "session_foreign",
      status: "created",
    };
    list
      .mockReset()
      .mockResolvedValue(paginator([candidate, foreignCandidate]));
    get.mockReset();
    const mixedOwnership = await deleteVerifiedSnapshots({
      Snapshot: { get, list },
      auth,
      name,
      observedSnapshot,
      wait: async () => undefined,
    });
    expect(mixedOwnership).toBe(false);
    expect(get).not.toHaveBeenCalled();

    list.mockReset().mockResolvedValue(paginator([candidate]));
    get.mockReset();
    const unanchored = await deleteVerifiedSnapshots({
      Snapshot: { get, list },
      auth,
      name,
      wait: async () => undefined,
    });
    expect(unanchored).toBe(false);
    expect(get).not.toHaveBeenCalled();

    list.mockReset().mockResolvedValue(paginator([]));
    get.mockReset();
    const emptyButUnanchored = await deleteVerifiedSnapshots({
      Snapshot: { get, list },
      auth,
      name,
      wait: async () => undefined,
    });
    expect(emptyButUnanchored).toBe(false);
    expect(get).not.toHaveBeenCalled();

    const wrongDelete = vi.fn(async () => undefined);
    list.mockReset().mockResolvedValue(paginator([candidate]));
    get.mockResolvedValue({
      delete: wrongDelete,
      snapshotId: "snapshot_wrong",
      sourceSessionId: observedSnapshot.sourceSessionId,
      status: "created",
    });
    const wrongLookup = await deleteVerifiedSnapshots({
      Snapshot: { get, list },
      auth,
      name,
      observedSnapshot,
      wait: async () => undefined,
    });
    expect(wrongLookup).toBe(false);
    expect(wrongDelete).not.toHaveBeenCalled();

    const exactDelete = vi.fn(async () => undefined);
    list
      .mockReset()
      .mockResolvedValueOnce(paginator([candidate]))
      .mockResolvedValueOnce(paginator([]));
    get.mockReset().mockResolvedValue({
      delete: exactDelete,
      snapshotId: observedSnapshot.snapshotId,
      sourceSessionId: observedSnapshot.sourceSessionId,
      status: "created",
    });
    const exact = await deleteVerifiedSnapshots({
      Snapshot: { get, list },
      auth,
      expectedSourceSessionId: observedSnapshot.sourceSessionId,
      name,
      observedSnapshot,
      wait: async () => undefined,
    });
    expect(exact).toBe(true);
    expect(exactDelete).toHaveBeenCalledOnce();

    const deleteSandbox = vi.fn(async () => true);
    const gated = await deleteSandboxAfterSnapshotCleanup({
      deleteSandbox,
      snapshotsCleaned: false,
    });
    expect(gated).toBe(false);
    expect(deleteSandbox).not.toHaveBeenCalled();

    const allowed = await deleteSandboxAfterSnapshotCleanup({
      deleteSandbox,
      snapshotsCleaned: true,
    });
    expect(allowed).toBe(true);
    expect(deleteSandbox).toHaveBeenCalledOnce();

    const deleteSnapshots = vi.fn(async () => true);
    const notAttempted = await deleteSnapshotsAfterCreationAttempt({
      creationAttempted: false,
      deleteSnapshots,
    });
    expect(notAttempted).toBe(true);
    expect(deleteSnapshots).not.toHaveBeenCalled();

    const ambiguousAttempt = await deleteSnapshotsAfterCreationAttempt({
      creationAttempted: true,
      deleteSnapshots,
    });
    expect(ambiguousAttempt).toBe(false);
    expect(deleteSnapshots).not.toHaveBeenCalled();

    const observedAttempt = await deleteSnapshotsAfterCreationAttempt({
      creationAttempted: true,
      deleteSnapshots,
      observedSnapshot,
    });
    expect(observedAttempt).toBe(true);
    expect(deleteSnapshots).toHaveBeenCalledOnce();
  });

  it("allows the orchestrator only its exact PostgreSQL and R2 hosts", () => {
    expect(proofScript).toContain(
      "networkPolicy: { allow: [postgresHost, r2Host] }",
    );
    expect(proofScript).toContain(
      'exactHostname("CALLYSTO_PROOF_POSTGRES_HOST")',
    );
    expect(proofScript).toContain('exactHostname("CALLYSTO_PROOF_R2_HOST")');
  });

  it("never prints raw provider or sandbox errors", () => {
    expect(proofScript).not.toMatch(/console\.(?:error|log)/);
    expect(proofScript).not.toContain("error.message}\n");
    expect(proofScript).toContain("process.stderr.write = () => true");
    expect(proofScript).toContain('error.message.startsWith("missing:")');
    expect(proofScript).toContain('error.message.startsWith("invalid:")');
    expect(proofScript).toContain(
      'error_code: safeInputError\n        ? "PROOF_INPUT_INVALID"',
    );
  });
});
