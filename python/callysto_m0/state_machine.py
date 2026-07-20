"""SQLite proof of lease-epoch and draft-generation fencing.

SQLite is used to make the local transition model executable. Production must
port these compare-and-swap predicates to PostgreSQL and use database time.
"""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Iterator


SCHEMA = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS drafts (
    id TEXT PRIMARY KEY,
    generation INTEGER NOT NULL CHECK (generation > 0),
    upload_id TEXT NOT NULL,
    render_status TEXT NOT NULL CHECK (render_status IN ('queued', 'rendering', 'ready', 'failed', 'quarantined')),
    manifest_digest TEXT,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS render_jobs (
    id TEXT PRIMARY KEY,
    draft_id TEXT NOT NULL REFERENCES drafts(id),
    draft_generation INTEGER NOT NULL CHECK (draft_generation > 0),
    upload_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'ready', 'failed', 'superseded')),
    lease_epoch INTEGER NOT NULL DEFAULT 0 CHECK (lease_epoch >= 0),
    lease_owner TEXT,
    lease_expires_at INTEGER,
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    manifest_digest TEXT,
    created_at INTEGER NOT NULL,
    finished_at INTEGER,
    UNIQUE (draft_id, draft_generation)
);

CREATE INDEX IF NOT EXISTS render_jobs_eligible_idx
ON render_jobs(status, lease_expires_at, created_at);
"""


@dataclass(frozen=True)
class Lease:
    job_id: str
    draft_id: str
    draft_generation: int
    upload_id: str
    lease_epoch: int
    lease_owner: str
    lease_expires_at: int


class CompletionOutcome(str, Enum):
    APPLIED = "applied"
    STALE_LEASE = "stale_lease"
    SUPERSEDED_GENERATION = "superseded_generation"
    DRAFT_NOT_WRITABLE = "draft_not_writable"


def connect(path: str | Path) -> sqlite3.Connection:
    connection = sqlite3.connect(str(path), isolation_level=None)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA busy_timeout = 2000")
    return connection


class StateStore:
    def __init__(self, connection: sqlite3.Connection):
        self.connection = connection
        self.connection.row_factory = sqlite3.Row
        self.connection.executescript(SCHEMA)

    @contextmanager
    def _transaction(self) -> Iterator[None]:
        self.connection.execute("BEGIN IMMEDIATE")
        try:
            yield
        except BaseException:
            self.connection.execute("ROLLBACK")
            raise
        else:
            self.connection.execute("COMMIT")

    @staticmethod
    def _job_id(draft_id: str, generation: int) -> str:
        return f"{draft_id}:generation:{generation}"

    def create_draft(self, *, draft_id: str, upload_id: str, now: int) -> str:
        job_id = self._job_id(draft_id, 1)
        with self._transaction():
            self.connection.execute(
                "INSERT INTO drafts(id, generation, upload_id, render_status, updated_at) VALUES (?, 1, ?, 'queued', ?)",
                (draft_id, upload_id, now),
            )
            self.connection.execute(
                """
                INSERT INTO render_jobs(
                    id, draft_id, draft_generation, upload_id, status, created_at
                ) VALUES (?, ?, 1, ?, 'queued', ?)
                """,
                (job_id, draft_id, upload_id, now),
            )
        return job_id

    def replace_upload(self, *, draft_id: str, upload_id: str, now: int) -> tuple[int, str]:
        """Advance the generation and enqueue exactly one replacement job."""

        with self._transaction():
            draft = self.connection.execute(
                "SELECT generation FROM drafts WHERE id = ?", (draft_id,)
            ).fetchone()
            if draft is None:
                raise KeyError(draft_id)
            generation = int(draft["generation"]) + 1
            self.connection.execute(
                """
                UPDATE drafts
                SET generation = ?, upload_id = ?, render_status = 'queued',
                    manifest_digest = NULL, updated_at = ?
                WHERE id = ?
                """,
                (generation, upload_id, now, draft_id),
            )
            # Queued work can be retired immediately. Processing work keeps its
            # lease so its eventual commit exercises the generation fence.
            self.connection.execute(
                """
                UPDATE render_jobs
                SET status = 'superseded', finished_at = ?
                WHERE draft_id = ? AND draft_generation < ? AND status = 'queued'
                """,
                (now, draft_id, generation),
            )
            job_id = self._job_id(draft_id, generation)
            self.connection.execute(
                """
                INSERT INTO render_jobs(
                    id, draft_id, draft_generation, upload_id, status, created_at
                ) VALUES (?, ?, ?, ?, 'queued', ?)
                """,
                (job_id, draft_id, generation, upload_id, now),
            )
        return generation, job_id

    def lease_next(self, *, worker_id: str, now: int, lease_seconds: int) -> Lease | None:
        if not worker_id:
            raise ValueError("worker_id must be non-empty")
        if lease_seconds <= 0:
            raise ValueError("lease_seconds must be positive")

        with self._transaction():
            row = self.connection.execute(
                """
                SELECT j.*
                FROM render_jobs AS j
                JOIN drafts AS d
                  ON d.id = j.draft_id
                 AND d.generation = j.draft_generation
                 AND d.upload_id = j.upload_id
                WHERE j.status = 'queued'
                   OR (j.status = 'processing' AND j.lease_expires_at <= ?)
                ORDER BY j.created_at, j.id
                LIMIT 1
                """,
                (now,),
            ).fetchone()
            if row is None:
                return None

            updated = self.connection.execute(
                """
                UPDATE render_jobs
                SET status = 'processing',
                    lease_epoch = lease_epoch + 1,
                    lease_owner = ?,
                    lease_expires_at = ?,
                    attempt_count = attempt_count + 1
                WHERE id = ?
                  AND (
                    status = 'queued'
                    OR (status = 'processing' AND lease_expires_at <= ?)
                  )
                """,
                (worker_id, now + lease_seconds, row["id"], now),
            )
            if updated.rowcount != 1:
                raise RuntimeError("lease compare-and-swap failed inside serialized transaction")

            self.connection.execute(
                """
                UPDATE drafts
                SET render_status = 'rendering', updated_at = ?
                WHERE id = ? AND generation = ? AND upload_id = ?
                  AND render_status IN ('queued', 'rendering')
                """,
                (now, row["draft_id"], row["draft_generation"], row["upload_id"]),
            )
            leased = self.connection.execute(
                "SELECT * FROM render_jobs WHERE id = ?", (row["id"],)
            ).fetchone()
            assert leased is not None
            return Lease(
                job_id=leased["id"],
                draft_id=leased["draft_id"],
                draft_generation=leased["draft_generation"],
                upload_id=leased["upload_id"],
                lease_epoch=leased["lease_epoch"],
                lease_owner=leased["lease_owner"],
                lease_expires_at=leased["lease_expires_at"],
            )

    def renew_lease(self, lease: Lease, *, now: int, lease_seconds: int) -> Lease | None:
        if lease_seconds <= 0:
            raise ValueError("lease_seconds must be positive")
        with self._transaction():
            updated = self.connection.execute(
                """
                UPDATE render_jobs
                SET lease_expires_at = ?
                WHERE id = ? AND status = 'processing'
                  AND lease_epoch = ? AND lease_owner = ?
                  AND lease_expires_at > ?
                """,
                (now + lease_seconds, lease.job_id, lease.lease_epoch, lease.lease_owner, now),
            )
            if updated.rowcount != 1:
                return None
            return Lease(
                job_id=lease.job_id,
                draft_id=lease.draft_id,
                draft_generation=lease.draft_generation,
                upload_id=lease.upload_id,
                lease_epoch=lease.lease_epoch,
                lease_owner=lease.lease_owner,
                lease_expires_at=now + lease_seconds,
            )

    def complete(self, lease: Lease, *, manifest_digest: str, now: int) -> CompletionOutcome:
        """Atomically commit only a current lease for the current draft generation."""

        with self._transaction():
            job = self.connection.execute(
                """
                SELECT * FROM render_jobs
                WHERE id = ? AND status = 'processing'
                  AND lease_epoch = ? AND lease_owner = ?
                  AND lease_expires_at > ?
                """,
                (lease.job_id, lease.lease_epoch, lease.lease_owner, now),
            ).fetchone()
            if job is None:
                return CompletionOutcome.STALE_LEASE

            draft = self.connection.execute(
                "SELECT * FROM drafts WHERE id = ?", (job["draft_id"],)
            ).fetchone()
            assert draft is not None
            if (
                draft["generation"] != job["draft_generation"]
                or draft["upload_id"] != job["upload_id"]
            ):
                self.connection.execute(
                    """
                    UPDATE render_jobs
                    SET status = 'superseded', lease_owner = NULL,
                        lease_expires_at = NULL, finished_at = ?
                    WHERE id = ? AND lease_epoch = ? AND lease_owner = ?
                    """,
                    (now, lease.job_id, lease.lease_epoch, lease.lease_owner),
                )
                return CompletionOutcome.SUPERSEDED_GENERATION

            if draft["render_status"] not in {"queued", "rendering"}:
                self.connection.execute(
                    """
                    UPDATE render_jobs
                    SET status = 'superseded', lease_owner = NULL,
                        lease_expires_at = NULL, finished_at = ?
                    WHERE id = ? AND lease_epoch = ? AND lease_owner = ?
                    """,
                    (now, lease.job_id, lease.lease_epoch, lease.lease_owner),
                )
                return CompletionOutcome.DRAFT_NOT_WRITABLE

            draft_update = self.connection.execute(
                """
                UPDATE drafts
                SET render_status = 'ready', manifest_digest = ?, updated_at = ?
                WHERE id = ? AND generation = ? AND upload_id = ?
                  AND render_status IN ('queued', 'rendering')
                """,
                (
                    manifest_digest,
                    now,
                    job["draft_id"],
                    job["draft_generation"],
                    job["upload_id"],
                ),
            )
            if draft_update.rowcount != 1:
                raise RuntimeError("draft fence changed inside serialized transaction")

            job_update = self.connection.execute(
                """
                UPDATE render_jobs
                SET status = 'ready', manifest_digest = ?, lease_owner = NULL,
                    lease_expires_at = NULL, finished_at = ?
                WHERE id = ? AND status = 'processing'
                  AND lease_epoch = ? AND lease_owner = ?
                """,
                (manifest_digest, now, lease.job_id, lease.lease_epoch, lease.lease_owner),
            )
            if job_update.rowcount != 1:
                raise RuntimeError("job fence changed inside serialized transaction")
            return CompletionOutcome.APPLIED

    def get_draft(self, draft_id: str) -> dict[str, object]:
        row = self.connection.execute("SELECT * FROM drafts WHERE id = ?", (draft_id,)).fetchone()
        if row is None:
            raise KeyError(draft_id)
        return dict(row)

    def get_job(self, job_id: str) -> dict[str, object]:
        row = self.connection.execute("SELECT * FROM render_jobs WHERE id = ?", (job_id,)).fetchone()
        if row is None:
            raise KeyError(job_id)
        return dict(row)
