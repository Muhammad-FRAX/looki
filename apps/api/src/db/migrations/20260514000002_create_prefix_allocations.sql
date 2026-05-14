-- Up Migration

CREATE TABLE IF NOT EXISTS prefix_allocations (
  id            BIGSERIAL    PRIMARY KEY,
  country_code  CHAR(2)      NOT NULL REFERENCES countries(code),
  prefix        TEXT         NOT NULL,
  prefix_length INTEGER      NOT NULL,
  carrier_name  TEXT,
  carrier_type  TEXT,
  region        TEXT,
  source        TEXT         NOT NULL,
  allocated_at  DATE,
  loaded_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT prefix_allocations_country_prefix_unique UNIQUE (country_code, prefix)
);

CREATE INDEX IF NOT EXISTS idx_prefix_allocations_lpm
  ON prefix_allocations (country_code, prefix_length DESC, prefix);

CREATE INDEX IF NOT EXISTS idx_prefix_allocations_created
  ON prefix_allocations (loaded_at DESC);

-- Down Migration

DROP TABLE IF EXISTS prefix_allocations;
