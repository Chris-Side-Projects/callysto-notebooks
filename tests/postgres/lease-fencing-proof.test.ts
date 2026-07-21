import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const SAFE_DATABASE_NAME = /^callysto_m0_proof(?:_[a-z0-9_]+)?$/;
const SAFE_SCHEMA_NAME = /^callysto_m0_[a-z0-9_]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESULT_MANIFEST_SHA256 = "1".repeat(64);
const CONFLICTING_RESULT_MANIFEST_SHA256 = "2".repeat(64);

interface ClaimRow {
  active_upload_id: string;
  claimed_at: Date;
  database_now: Date;
  draft_generation: string;
  job_id: string;
  lease_expires_at: Date;
  lease_generation: string;
  lease_token: string;
}

interface CompletionRow {
  completed_at: Date;
  job_id: string;
  outcome: "completed" | "duplicate";
  result_manifest_sha256: string;
}

interface DatabaseClockRow {
  database_now: Date;
}

type ProofSql = postgres.Sql | postgres.TransactionSql;

function requireSafeTestDatabaseUrl(value: string | undefined): string {
  if (!value) {
    throw new Error(
      "CALLYSTO_TEST_DATABASE_URL is required for the PostgreSQL proof",
    );
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("CALLYSTO_TEST_DATABASE_URL is not a valid URL");
  }

  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("PostgreSQL proof URL must use postgres or postgresql");
  }

  const hostname = url.hostname.toLowerCase();
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname)) {
    throw new Error("PostgreSQL proof refuses a non-loopback database host");
  }

  const databaseName = decodeURIComponent(url.pathname.slice(1));
  if (!SAFE_DATABASE_NAME.test(databaseName)) {
    throw new Error(
      "PostgreSQL proof requires a dedicated callysto_m0_proof database",
    );
  }

  return value;
}

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
} {
  let resolvePromise!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolveValue) => {
    resolvePromise = resolveValue;
  });
  return { promise, resolve: resolvePromise };
}

describe("PostgreSQL Milestone 0 lease and fencing proof", () => {
  const schemaName = `callysto_m0_${process.pid}_${randomBytes(6).toString("hex")}`;
  if (!SAFE_SCHEMA_NAME.test(schemaName)) {
    throw new Error(
      "Generated PostgreSQL proof schema was not a safe identifier",
    );
  }

  const tableName = `"${schemaName}"."render_job_proof"`;
  let sql: postgres.Sql | undefined;

  beforeAll(async () => {
    const databaseUrl = requireSafeTestDatabaseUrl(
      process.env.CALLYSTO_TEST_DATABASE_URL,
    );
    sql = postgres(databaseUrl, {
      connect_timeout: 5,
      max: 5,
      onnotice: () => undefined,
    });

    await sql.unsafe(`CREATE SCHEMA "${schemaName}"`);
    const ddlPath = resolve(
      import.meta.dirname,
      "../../proofs/m0/postgres/lease-fencing-proof.sql",
    );
    const proofDdl = (await readFile(ddlPath, "utf8")).replaceAll(
      "__PROOF_SCHEMA__",
      `"${schemaName}"`,
    );
    await sql.unsafe(proofDdl);
  }, 10_000);

  afterAll(async () => {
    if (!sql) return;
    try {
      await sql.unsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    } finally {
      await sql.end({ timeout: 5 });
    }
  }, 10_000);

  beforeEach(async () => {
    if (!sql) throw new Error("PostgreSQL proof client is not initialized");
    await sql.unsafe(`TRUNCATE TABLE ${tableName}`);
  });

  async function databaseNow(client: ProofSql): Promise<Date> {
    const [row] = await client.unsafe<DatabaseClockRow[]>(
      "SELECT clock_timestamp() AS database_now",
    );
    if (!row) throw new Error("PostgreSQL did not return its clock");
    return row.database_now;
  }

  async function enqueue(
    jobId: string,
    enqueueOrder: number,
    uploadId: string,
    draftGeneration = 1,
  ): Promise<void> {
    if (!sql) throw new Error("PostgreSQL proof client is not initialized");
    await sql.unsafe(
      `INSERT INTO ${tableName}
        (job_id, enqueue_order, active_upload_id, draft_generation, state)
       VALUES ($1, $2, $3, $4, 'queued')`,
      [jobId, enqueueOrder, uploadId, draftGeneration],
    );
  }

  async function claim(
    client: ProofSql,
    leaseMilliseconds: number,
  ): Promise<ClaimRow | undefined> {
    const rows = await client.unsafe<ClaimRow[]>(
      `WITH candidate AS (
         SELECT job_id
         FROM ${tableName}
         WHERE state = 'queued'
            OR (state = 'leased' AND lease_expires_at <= clock_timestamp())
         ORDER BY enqueue_order, job_id
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       UPDATE ${tableName} AS job
       SET state = 'leased',
           lease_token = gen_random_uuid(),
           lease_generation = job.lease_generation + 1,
           claimed_at = clock_timestamp(),
           lease_expires_at = clock_timestamp()
             + ($1::double precision * interval '1 millisecond')
       FROM candidate
       WHERE job.job_id = candidate.job_id
       RETURNING job.job_id,
                 job.active_upload_id,
                 job.draft_generation,
                 job.lease_token,
                 job.lease_generation,
                 job.claimed_at,
                 job.lease_expires_at,
                 clock_timestamp() AS database_now`,
      [leaseMilliseconds],
    );
    return rows[0];
  }

  async function complete(
    client: ProofSql,
    claimRow: ClaimRow,
    resultManifestSha256: string,
  ): Promise<CompletionRow | undefined> {
    const rows = await client.unsafe<CompletionRow[]>(
      `WITH completed AS (
         UPDATE ${tableName}
         SET state = 'completed',
             completed_lease_token = lease_token,
             completed_lease_generation = lease_generation,
             result_manifest_sha256 = $6,
             completed_at = clock_timestamp(),
             lease_token = NULL,
             lease_expires_at = NULL
         WHERE job_id = $1
           AND active_upload_id = $2
           AND draft_generation = $3
           AND state = 'leased'
           AND lease_token = $4
           AND lease_generation = $5
           AND lease_expires_at > clock_timestamp()
         RETURNING job_id, completed_at, result_manifest_sha256
       )
       SELECT job_id, completed_at, result_manifest_sha256, 'completed'::text AS outcome
       FROM completed
       UNION ALL
       SELECT job_id, completed_at, result_manifest_sha256, 'duplicate'::text AS outcome
       FROM ${tableName}
       WHERE job_id = $1
         AND active_upload_id = $2
         AND draft_generation = $3
         AND state = 'completed'
         AND completed_lease_token = $4
         AND completed_lease_generation = $5
         AND result_manifest_sha256 = $6
         AND NOT EXISTS (SELECT 1 FROM completed)`,
      [
        claimRow.job_id,
        claimRow.active_upload_id,
        claimRow.draft_generation,
        claimRow.lease_token,
        claimRow.lease_generation,
        resultManifestSha256,
      ],
    );
    return rows[0];
  }

  it("refuses absent, non-loopback, and non-dedicated database targets", () => {
    expect(() => requireSafeTestDatabaseUrl(undefined)).toThrow(
      "CALLYSTO_TEST_DATABASE_URL is required",
    );
    expect(() =>
      requireSafeTestDatabaseUrl(
        "postgresql://proof@example.com/callysto_m0_proof",
      ),
    ).toThrow("non-loopback");
    expect(() =>
      requireSafeTestDatabaseUrl("postgresql://proof@127.0.0.1/postgres"),
    ).toThrow("dedicated callysto_m0_proof database");
  });

  it("uses SKIP LOCKED so concurrent workers claim distinct jobs while the first lock is held", async () => {
    if (!sql) throw new Error("PostgreSQL proof client is not initialized");
    await enqueue("concurrent-first", 10, "upload-concurrent-first");
    await enqueue("concurrent-second", 20, "upload-concurrent-second");

    const firstClaimed = createDeferred<ClaimRow>();
    const releaseFirstTransaction = createDeferred<void>();
    const firstWorker = sql.begin(async (transaction) => {
      const claimed = await claim(transaction, 5_000);
      if (!claimed) throw new Error("First worker did not claim a job");
      firstClaimed.resolve(claimed);
      await releaseFirstTransaction.promise;
      return claimed;
    });

    const first = await firstClaimed.promise;
    try {
      const second = await sql.begin((transaction) =>
        claim(transaction, 5_000),
      );
      expect(first.job_id).toBe("concurrent-first");
      expect(second?.job_id).toBe("concurrent-second");
      expect(first.lease_generation).toBe("1");
      expect(second?.lease_generation).toBe("1");
      expect(first.lease_token).toMatch(UUID_PATTERN);
      expect(second?.lease_token).toMatch(UUID_PATTERN);
      expect(second?.lease_token).not.toBe(first.lease_token);
    } finally {
      releaseFirstTransaction.resolve();
    }
    await firstWorker;
  }, 10_000);

  it("uses the database clock and rejects an expired lease after reclaim", async () => {
    if (!sql) throw new Error("PostgreSQL proof client is not initialized");
    await enqueue("expiry-reclaim", 30, "upload-expiry");

    const beforeClaim = await databaseNow(sql);
    const originalClaim = await claim(sql, 60);
    const afterClaim = await databaseNow(sql);
    expect(originalClaim?.job_id).toBe("expiry-reclaim");
    if (!originalClaim) return;

    expect(originalClaim.claimed_at.getTime()).toBeGreaterThanOrEqual(
      beforeClaim.getTime(),
    );
    expect(originalClaim.claimed_at.getTime()).toBeLessThanOrEqual(
      afterClaim.getTime(),
    );
    expect(originalClaim.database_now.getTime()).toBeGreaterThanOrEqual(
      originalClaim.claimed_at.getTime(),
    );
    expect(originalClaim.lease_expires_at.getTime()).toBeGreaterThan(
      originalClaim.database_now.getTime(),
    );

    await sql.unsafe("SELECT pg_sleep(0.12)");
    const replacementClaim = await claim(sql, 5_000);
    expect(replacementClaim?.job_id).toBe("expiry-reclaim");
    if (!replacementClaim) return;

    expect(replacementClaim.job_id).toBe(originalClaim.job_id);
    expect(replacementClaim.lease_generation).toBe("2");
    expect(replacementClaim.lease_token).toMatch(UUID_PATTERN);
    expect(replacementClaim.lease_token).not.toBe(originalClaim.lease_token);
    expect(
      await complete(sql, originalClaim, RESULT_MANIFEST_SHA256),
    ).toBeUndefined();

    const completed = await complete(
      sql,
      replacementClaim,
      RESULT_MANIFEST_SHA256,
    );
    expect(completed?.outcome).toBe("completed");
    expect(completed?.result_manifest_sha256).toBe(RESULT_MANIFEST_SHA256);
    const duplicate = await complete(
      sql,
      replacementClaim,
      RESULT_MANIFEST_SHA256,
    );
    expect(duplicate).toMatchObject({
      job_id: replacementClaim.job_id,
      outcome: "duplicate",
      result_manifest_sha256: RESULT_MANIFEST_SHA256,
    });
    expect(duplicate?.completed_at.getTime()).toBe(
      completed?.completed_at.getTime(),
    );
    expect(
      await complete(sql, replacementClaim, CONFLICTING_RESULT_MANIFEST_SHA256),
    ).toBeUndefined();
    expect(
      await complete(sql, replacementClaim, RESULT_MANIFEST_SHA256),
    ).toMatchObject({
      completed_at: completed?.completed_at,
      outcome: "duplicate",
      result_manifest_sha256: RESULT_MANIFEST_SHA256,
    });
  });

  it("rejects an old worker after an active upload and draft generation replacement", async () => {
    if (!sql) throw new Error("PostgreSQL proof client is not initialized");
    await enqueue("draft-replacement", 40, "upload-v1", 1);
    const supersededClaim = await claim(sql, 5_000);
    expect(supersededClaim?.job_id).toBe("draft-replacement");
    if (!supersededClaim) return;

    const replacement = await sql.unsafe<
      { active_upload_id: string; draft_generation: string }[]
    >(
      `UPDATE ${tableName}
       SET active_upload_id = $2,
           draft_generation = $3,
           state = 'queued',
           lease_token = NULL,
           claimed_at = NULL,
           lease_expires_at = NULL
       WHERE job_id = $1
         AND draft_generation < $3
       RETURNING active_upload_id, draft_generation`,
      [supersededClaim.job_id, "upload-v2", 2],
    );
    expect(replacement[0]).toEqual({
      active_upload_id: "upload-v2",
      draft_generation: "2",
    });
    expect(
      await complete(sql, supersededClaim, RESULT_MANIFEST_SHA256),
    ).toBeUndefined();

    const currentClaim = await claim(sql, 5_000);
    expect(currentClaim).toMatchObject({
      active_upload_id: "upload-v2",
      draft_generation: "2",
      job_id: "draft-replacement",
      lease_generation: "2",
    });
    expect(currentClaim?.lease_token).not.toBe(supersededClaim.lease_token);
    if (!currentClaim) return;
    expect(
      (await complete(sql, currentClaim, RESULT_MANIFEST_SHA256))?.outcome,
    ).toBe("completed");
  });
});
