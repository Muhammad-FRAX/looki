-- Up Migration

CREATE TABLE IF NOT EXISTS data_loads (
  id            TEXT         PRIMARY KEY,
  source        TEXT         NOT NULL,
  country_code  CHAR(2)      NOT NULL,
  row_count     INTEGER,
  status        TEXT         NOT NULL,
  error_message TEXT,
  started_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  finished_at   TIMESTAMPTZ
);

-- Down Migration

DROP TABLE IF EXISTS data_loads;
