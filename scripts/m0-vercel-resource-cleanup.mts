type ProofAuth = { projectId: string; teamId: string; token: string };

type SandboxLike = {
  delete(): Promise<unknown>;
  name: string;
  status: string;
  stop(): Promise<unknown>;
};

type SandboxApi = {
  get(
    options: ProofAuth & { name: string; resume: false },
  ): Promise<SandboxLike>;
};

type SnapshotListItem = {
  id: string;
  sourceSessionId: string;
  status: string;
};

type SnapshotLike = {
  delete(): Promise<unknown>;
  snapshotId: string;
  sourceSessionId: string;
  status: string;
};

type SnapshotApi = {
  get(options: ProofAuth & { snapshotId: string }): Promise<SnapshotLike>;
  list(options: ProofAuth & { name: string }): Promise<{
    toArray(): Promise<SnapshotListItem[]>;
  }>;
};

function validResourceName(name: string): boolean {
  return /^callysto-m0-[a-z0-9-]{1,120}$/u.test(name);
}

export async function deleteSnapshotsAfterCreationAttempt<T>({
  creationAttempted,
  deleteSnapshots,
  observedSnapshot,
}: {
  creationAttempted: boolean;
  deleteSnapshots(snapshot: T): Promise<boolean>;
  observedSnapshot?: T;
}): Promise<boolean> {
  if (!creationAttempted) return true;
  if (observedSnapshot === undefined) return false;
  return deleteSnapshots(observedSnapshot);
}

export async function deleteSandboxAfterSnapshotCleanup({
  deleteSandbox,
  snapshotsCleaned,
}: {
  deleteSandbox(): Promise<boolean>;
  snapshotsCleaned: boolean;
}): Promise<boolean> {
  if (!snapshotsCleaned) return false;
  return deleteSandbox();
}

export async function deleteVerifiedSandbox({
  Sandbox,
  auth,
  isNotFound,
  name,
  observedSandbox,
  terminalStates,
  wait,
}: {
  Sandbox: SandboxApi;
  auth: ProofAuth;
  isNotFound(error: unknown): boolean;
  name: string;
  observedSandbox?: Pick<SandboxLike, "name">;
  terminalStates: ReadonlySet<string>;
  wait(): Promise<void>;
}): Promise<boolean> {
  try {
    if (
      !validResourceName(name) ||
      (observedSandbox !== undefined && observedSandbox.name !== name)
    ) {
      return false;
    }

    let target: SandboxLike;
    try {
      target = await Sandbox.get({ ...auth, name, resume: false });
    } catch (error) {
      return isNotFound(error);
    }
    if (target.name !== name) return false;

    if (!terminalStates.has(target.status)) {
      await target.stop();
    }

    let inspected: SandboxLike;
    try {
      inspected = await Sandbox.get({ ...auth, name, resume: false });
    } catch (error) {
      return isNotFound(error);
    }
    if (inspected.name !== name || !terminalStates.has(inspected.status)) {
      return false;
    }
    await inspected.delete();

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await wait();
      try {
        const remaining = await Sandbox.get({ ...auth, name, resume: false });
        if (remaining.name !== name) return false;
      } catch (error) {
        if (isNotFound(error)) return true;
        return false;
      }
    }
  } catch {
    // The caller reports cleanup failure through the allowlisted proof schema.
  }
  return false;
}

export async function deleteVerifiedSnapshots({
  Snapshot,
  auth,
  expectedSourceSessionId,
  name,
  observedSnapshot,
  wait,
}: {
  Snapshot: SnapshotApi;
  auth: ProofAuth;
  expectedSourceSessionId?: string;
  name: string;
  observedSnapshot?: Pick<
    SnapshotLike,
    "snapshotId" | "sourceSessionId" | "status"
  >;
  wait(): Promise<void>;
}): Promise<boolean> {
  try {
    if (!validResourceName(name)) return false;
    const ownedSourceSessionId =
      expectedSourceSessionId ?? observedSnapshot?.sourceSessionId;
    if (
      ownedSourceSessionId === undefined ||
      !ownedSourceSessionId ||
      ownedSourceSessionId.trim() !== ownedSourceSessionId
    ) {
      return false;
    }
    if (
      observedSnapshot !== undefined &&
      (observedSnapshot.status !== "created" ||
        !observedSnapshot.snapshotId ||
        !observedSnapshot.sourceSessionId)
    ) {
      return false;
    }

    const listed = await Snapshot.list({ ...auth, name });
    const candidates = (await listed.toArray()).filter(
      (candidate) => candidate.status === "created",
    );
    if (
      observedSnapshot !== undefined &&
      !candidates.some(
        (candidate) =>
          candidate.id === observedSnapshot.snapshotId &&
          candidate.sourceSessionId === observedSnapshot.sourceSessionId,
      )
    ) {
      return false;
    }
    if (
      candidates.some(
        (candidate) =>
          !candidate.id ||
          !candidate.sourceSessionId ||
          candidate.sourceSessionId !== ownedSourceSessionId,
      )
    ) {
      return false;
    }

    const verified: SnapshotLike[] = [];
    for (const candidate of candidates) {
      const recovered = await Snapshot.get({
        ...auth,
        snapshotId: candidate.id,
      });
      if (
        recovered.status !== "created" ||
        recovered.snapshotId !== candidate.id ||
        recovered.sourceSessionId !== candidate.sourceSessionId
      ) {
        return false;
      }
      verified.push(recovered);
    }
    for (const snapshot of verified) {
      await snapshot.delete();
    }

    await wait();
    const reconciled = await Snapshot.list({ ...auth, name });
    return !(await reconciled.toArray()).some(
      (candidate) => candidate.status === "created",
    );
  } catch {
    return false;
  }
}
