-- Up Migration
-- Performance pass (step 17): additional covering indexes identified during
-- benchmark analysis. See docs/architecture.md for rationale.

-- /me/keys: SELECT ... FROM api_keys WHERE user_id = $1 AND revoked_at IS NULL ORDER BY created_at DESC
-- The existing idx_api_keys_hash covers key authentication lookups, but there is no index
-- for listing a user's own active keys. This partial covering index eliminates the table scan.
CREATE INDEX IF NOT EXISTS idx_api_keys_user_active
  ON api_keys (user_id, created_at DESC)
  WHERE revoked_at IS NULL;

-- /admin/users: SELECT ... FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2
-- Without this index, the paginated admin user list requires a full sequential scan + sort.
CREATE INDEX IF NOT EXISTS idx_users_created
  ON users (created_at DESC);

-- Down Migration

DROP INDEX IF EXISTS idx_api_keys_user_active;
DROP INDEX IF EXISTS idx_users_created;
