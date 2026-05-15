-- Up Migration

CREATE TABLE IF NOT EXISTS usage_log (
  id           TEXT         PRIMARY KEY,
  api_key_id   TEXT         REFERENCES api_keys(id) ON DELETE SET NULL,
  user_id      TEXT         REFERENCES users(id) ON DELETE SET NULL,
  endpoint     TEXT         NOT NULL,
  input_number TEXT,
  e164         TEXT,
  country_code CHAR(2),
  line_type    TEXT,
  cache_hit    BOOLEAN      NOT NULL,
  status_code  INTEGER      NOT NULL,
  latency_ms   INTEGER      NOT NULL,
  request_ip   INET,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_log_api_key
  ON usage_log (api_key_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_log_user
  ON usage_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_log_created
  ON usage_log (created_at DESC);

CREATE TABLE IF NOT EXISTS jobs (
  id            TEXT         PRIMARY KEY,
  user_id       TEXT         NOT NULL REFERENCES users(id),
  api_key_id    TEXT         REFERENCES api_keys(id),
  status        TEXT         NOT NULL,
  total         INTEGER      NOT NULL,
  processed     INTEGER      NOT NULL DEFAULT 0,
  webhook_url   TEXT,
  result_path   TEXT,
  error_message TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  finished_at   TIMESTAMPTZ
);

-- Down Migration

DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS usage_log;
