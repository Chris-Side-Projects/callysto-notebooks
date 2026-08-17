-- MILESTONE 0 PROOF ONLY.
--
-- This is deliberately not a product migration and must never be applied by
-- application startup or a production migration runner. The Vitest proof
-- substitutes __PROOF_SCHEMA__ with a fresh, test-owned schema and removes the
-- entire schema after the assertions finish.

CREATE TABLE __PROOF_SCHEMA__.render_job_proof (
  job_id text PRIMARY KEY,
  enqueue_order integer NOT NULL UNIQUE,
  active_upload_id text NOT NULL,
  draft_generation bigint NOT NULL CHECK (draft_generation > 0),
  state text NOT NULL CHECK (state IN ('queued', 'leased', 'completed')),
  lease_token uuid,
  lease_generation bigint NOT NULL DEFAULT 0 CHECK (lease_generation >= 0),
  claimed_at timestamp with time zone,
  lease_expires_at timestamp with time zone,
  completed_lease_token uuid,
  completed_lease_generation bigint,
  result_manifest_sha256 text CHECK (
    result_manifest_sha256 IS NULL
    OR result_manifest_sha256 ~ '^[0-9a-f]{64}$'
  ),
  completed_at timestamp with time zone,
  CHECK (
    (
      state = 'queued'
      AND lease_token IS NULL
      AND lease_expires_at IS NULL
      AND result_manifest_sha256 IS NULL
    )
    OR
    (
      state = 'leased'
      AND lease_token IS NOT NULL
      AND lease_expires_at IS NOT NULL
      AND result_manifest_sha256 IS NULL
    )
    OR
    (
      state = 'completed'
      AND completed_lease_token IS NOT NULL
      AND completed_lease_generation IS NOT NULL
      AND result_manifest_sha256 IS NOT NULL
    )
  )
);
