from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from callysto_m0.state_machine import CompletionOutcome, StateStore, connect


class StateMachineTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        database = Path(self.temporary.name) / "state.sqlite3"
        self.connection_a = connect(database)
        self.connection_b = connect(database)
        self.store_a = StateStore(self.connection_a)
        self.store_b = StateStore(self.connection_b)

    def tearDown(self) -> None:
        self.connection_a.close()
        self.connection_b.close()
        self.temporary.cleanup()

    def test_new_lease_epoch_fences_expired_worker(self) -> None:
        self.store_a.create_draft(draft_id="d1", upload_id="u1", now=0)
        lease_a = self.store_a.lease_next(worker_id="worker-a", now=0, lease_seconds=10)
        self.assertIsNotNone(lease_a)
        assert lease_a is not None
        self.assertIsNone(self.store_b.lease_next(worker_id="worker-b", now=9, lease_seconds=10))

        lease_b = self.store_b.lease_next(worker_id="worker-b", now=10, lease_seconds=10)
        self.assertIsNotNone(lease_b)
        assert lease_b is not None
        self.assertEqual(lease_b.lease_epoch, lease_a.lease_epoch + 1)
        self.assertEqual(
            self.store_a.complete(lease_a, manifest_digest="old", now=11),
            CompletionOutcome.STALE_LEASE,
        )
        self.assertEqual(
            self.store_b.complete(lease_b, manifest_digest="winner", now=11),
            CompletionOutcome.APPLIED,
        )
        draft = self.store_a.get_draft("d1")
        self.assertEqual(draft["render_status"], "ready")
        self.assertEqual(draft["manifest_digest"], "winner")

    def test_expired_lease_cannot_commit_without_releasing(self) -> None:
        self.store_a.create_draft(draft_id="d1", upload_id="u1", now=0)
        lease = self.store_a.lease_next(worker_id="worker", now=0, lease_seconds=5)
        assert lease is not None
        self.assertEqual(
            self.store_a.complete(lease, manifest_digest="late", now=5),
            CompletionOutcome.STALE_LEASE,
        )
        self.assertNotEqual(self.store_a.get_draft("d1")["render_status"], "ready")

    def test_renewal_is_fenced_by_owner_epoch_and_expiry(self) -> None:
        self.store_a.create_draft(draft_id="d1", upload_id="u1", now=0)
        lease = self.store_a.lease_next(worker_id="worker-a", now=0, lease_seconds=5)
        assert lease is not None
        renewed = self.store_a.renew_lease(lease, now=3, lease_seconds=10)
        self.assertIsNotNone(renewed)
        assert renewed is not None
        self.assertEqual(renewed.lease_expires_at, 13)

        impostor = type(lease)(
            job_id=lease.job_id,
            draft_id=lease.draft_id,
            draft_generation=lease.draft_generation,
            upload_id=lease.upload_id,
            lease_epoch=lease.lease_epoch,
            lease_owner="worker-b",
            lease_expires_at=renewed.lease_expires_at,
        )
        self.assertIsNone(self.store_b.renew_lease(impostor, now=4, lease_seconds=10))

    def test_replacement_generation_fences_inflight_old_upload(self) -> None:
        old_job = self.store_a.create_draft(draft_id="d1", upload_id="u1", now=0)
        old_lease = self.store_a.lease_next(worker_id="worker-old", now=1, lease_seconds=100)
        assert old_lease is not None

        generation, new_job = self.store_b.replace_upload(draft_id="d1", upload_id="u2", now=2)
        self.assertEqual(generation, 2)
        new_lease = self.store_b.lease_next(worker_id="worker-new", now=3, lease_seconds=100)
        assert new_lease is not None
        self.assertEqual(new_lease.job_id, new_job)

        self.assertEqual(
            self.store_a.complete(old_lease, manifest_digest="stale", now=4),
            CompletionOutcome.SUPERSEDED_GENERATION,
        )
        interim = self.store_a.get_draft("d1")
        self.assertEqual(interim["generation"], 2)
        self.assertEqual(interim["upload_id"], "u2")
        self.assertNotEqual(interim["manifest_digest"], "stale")
        self.assertEqual(self.store_a.get_job(old_job)["status"], "superseded")

        self.assertEqual(
            self.store_b.complete(new_lease, manifest_digest="current", now=5),
            CompletionOutcome.APPLIED,
        )
        final = self.store_a.get_draft("d1")
        self.assertEqual(final["manifest_digest"], "current")
        self.assertEqual(self.store_a.get_job(new_job)["manifest_digest"], "current")

    def test_duplicate_completion_cannot_overwrite_manifest(self) -> None:
        job = self.store_a.create_draft(draft_id="d1", upload_id="u1", now=0)
        lease = self.store_a.lease_next(worker_id="worker", now=1, lease_seconds=10)
        assert lease is not None
        self.assertEqual(
            self.store_a.complete(lease, manifest_digest="first", now=2),
            CompletionOutcome.APPLIED,
        )
        self.assertEqual(
            self.store_a.complete(lease, manifest_digest="second", now=3),
            CompletionOutcome.STALE_LEASE,
        )
        self.assertEqual(self.store_a.get_draft("d1")["manifest_digest"], "first")
        self.assertEqual(self.store_a.get_job(job)["manifest_digest"], "first")


if __name__ == "__main__":
    unittest.main()
