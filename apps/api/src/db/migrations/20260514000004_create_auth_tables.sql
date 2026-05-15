-- Up Migration

CREATE TABLE IF NOT EXISTS users (
  id            TEXT         PRIMARY KEY,
  email         CITEXT       UNIQUE NOT NULL,
  password_hash TEXT         NOT NULL,
  role          TEXT         NOT NULL DEFAULT 'user',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         TEXT         PRIMARY KEY,
  user_id    TEXT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ  NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user
  ON refresh_tokens (user_id)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS api_keys (
  id           TEXT         PRIMARY KEY,
  user_id      TEXT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT         NOT NULL,
  key_hash     TEXT         NOT NULL UNIQUE,
  key_prefix   TEXT         NOT NULL,
  tier         TEXT         NOT NULL DEFAULT 'free',
  revoked_at   TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash
  ON api_keys (key_hash)
  WHERE revoked_at IS NULL;

-- Down Migration

DROP TABLE IF EXISTS api_keys;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;
