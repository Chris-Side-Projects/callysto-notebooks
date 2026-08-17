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

type ProviderPage = {
  pagination: unknown;
  [key: string]: unknown;
};

type ProviderPaginator = {
  pages(): AsyncIterable<ProviderPage>;
};

type SnapshotLike = {
  delete(): Promise<unknown>;
  snapshotId: string;
  sourceSessionId: string;
  status: string;
};

type SnapshotApi = {
  get(options: ProofAuth & { snapshotId: string }): Promise<SnapshotLike>;
  list(
    options: ProofAuth & { name: string; signal: AbortSignal },
  ): Promise<ProviderPaginator>;
};

const PROVIDER_LIST_TIMEOUT_MS = 20_000;
const PROVIDER_PAGINATION_MAX_CURSOR_LENGTH = 2_048;
const PROVIDER_PAGINATION_MAX_ITEMS = 256;
const PROVIDER_PAGINATION_MAX_PAGES = 16;

export function providerListSignal(): AbortSignal {
  return AbortSignal.timeout(PROVIDER_LIST_TIMEOUT_MS);
}

export async function collectBoundedPaginator<T>(
  paginator: ProviderPaginator,
  itemsKey: string,
): Promise<T[]> {
  const items: T[] = [];
  const seenCursors = new Set<string>();
  let lastNext: string | null | undefined;
  let pageCount = 0;
  for await (const page of paginator.pages()) {
    pageCount += 1;
    if (pageCount > PROVIDER_PAGINATION_MAX_PAGES) {
      throw new Error("PAGINATION_PAGE_LIMIT_EXCEEDED");
    }
    if (!page || typeof page !== "object") {
      throw new Error("PAGINATION_PAGE_INVALID");
    }
    const pageItems = page[itemsKey];
    const pagination = page.pagination;
    const paginationCount =
      pagination && typeof pagination === "object" && "count" in pagination
        ? pagination.count
        : null;
    const paginationNext =
      pagination && typeof pagination === "object" && "next" in pagination
        ? pagination.next
        : undefined;
    if (
      !Array.isArray(pageItems) ||
      !pagination ||
      typeof pagination !== "object" ||
      typeof paginationCount !== "number" ||
      !Number.isSafeInteger(paginationCount) ||
      paginationCount < 0 ||
      (paginationNext !== null && typeof paginationNext !== "string")
    ) {
      throw new Error("PAGINATION_PAGE_INVALID");
    }
    if (items.length + pageItems.length > PROVIDER_PAGINATION_MAX_ITEMS) {
      throw new Error("PAGINATION_ITEM_LIMIT_EXCEEDED");
    }
    items.push(...(pageItems as T[]));
    lastNext = paginationNext;
    if (lastNext !== null) {
      if (
        !lastNext ||
        lastNext.length > PROVIDER_PAGINATION_MAX_CURSOR_LENGTH
      ) {
        throw new Error("PAGINATION_CURSOR_INVALID");
      }
      if (seenCursors.has(lastNext)) {
        throw new Error("PAGINATION_CURSOR_REPEATED");
      }
      seenCursors.add(lastNext);
    }
  }
  if (pageCount === 0 || lastNext !== null) {
    throw new Error("PAGINATION_INCOMPLETE");
  }
  return items;
}

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

    const listed = await Snapshot.list({
      ...auth,
      name,
      signal: providerListSignal(),
    });
    const candidates = (
      await collectBoundedPaginator<SnapshotListItem>(listed, "snapshots")
    ).filter((candidate) => candidate.status === "created");
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
    const reconciled = await Snapshot.list({
      ...auth,
      name,
      signal: providerListSignal(),
    });
    return !(
      await collectBoundedPaginator<SnapshotListItem>(reconciled, "snapshots")
    ).some((candidate) => candidate.status === "created");
  } catch {
    return false;
  }
}
