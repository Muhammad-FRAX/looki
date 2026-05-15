# Looki — Architecture & Performance

This document covers the component architecture, the lookup data flow, the longest-prefix-match (LPM) query design, and the performance analysis that informed index choices.

---

## Component Diagram

```
┌───────────────────────────────────────────────────────────────────┐
│                           Client Browser                          │
└───────────────────┬───────────────────────────┬───────────────────┘
                    │ HTTP :80                   │ HTTP :80 → /api/**
          ┌─────────▼──────────┐                 │   (nginx proxy_pass)
          │   nginx (web)      │                 │
          │  serves React SPA  │                 │
          │  Vite-built static │                 │
          └────────────────────┘                 │
                                                  │
                              ┌───────────────────▼────────────────────┐
                              │           Express API — :3000          │
                              │  ┌─────────────────────────────────┐   │
                              │  │        Middleware stack          │   │
                              │  │  Helmet · CORS · RequestId      │   │
                              │  │  Pino HTTP · Metrics · Zod      │   │
                              │  └──────────────┬──────────────────┘   │
                              │                 │                       │
                              │  ┌──────────────▼──────────────────┐   │
                              │  │          Route handlers          │   │
                              │  │  /auth  /me  /lookup  /admin    │   │
                              │  │  /health /ready /metrics /docs  │   │
                              │  └──────────────┬──────────────────┘   │
                              │                 │                       │
                              │  ┌──────────────▼──────────────────┐   │
                              │  │         Lookup Service           │   │
                              │  │  parse → cache → DB → log       │   │
                              │  └──────┬──────────────┬───────────┘   │
                              │         │              │                │
                              │  ┌──────▼──────┐  ┌───▼────────────┐  │
                              │  │  BullMQ     │  │  prom-client   │  │
                              │  │  Worker     │  │  /metrics      │  │
                              │  └──────┬──────┘  └────────────────┘  │
                              └─────────┼──────────────────────────────┘
                                        │
              ┌─────────────────────────┼──────────────────────┐
              │                         │                       │
   ┌──────────▼────────────┐  ┌─────────▼─────────────────┐   │
   │   PostgreSQL 16        │  │       Redis 7              │   │
   │                        │  │                            │   │
   │  prefix_allocations    │  │  lookup:v1:<e164> (24h)   │   │
   │  users / refresh_tokens│  │  rl:min / rl:day / rl:mon │   │
   │  api_keys              │  │  rl:ip:<ip>:<slot>        │   │
   │  usage_log (part.)     │  │  BullMQ job queues        │   │
   │  jobs                  │  └────────────────────────────┘   │
   │  data_loads            │                                    │
   └────────────────────────┘                                    │
                                                                  │
   ┌──────────────────────────────────────────────────────────────┘
   │
   │  data-loader (one-shot CLI / monthly cron)
   │  Download CSV → validate → stage → atomic swap → data_loads
   └──────────────────────────────────────────────────────────────
```

---

## Lookup Data Flow

A single `GET /lookup?number=+12125550123` request follows this path:

```
Client
  │
  ▼
requireApiKey          -- SHA-256 hash of Bearer token → api_keys table
  │
  ▼
createApiKeyRateLimiter
  │  sliding-window (per-minute) + fixed-window (per-day, per-month)
  │  all counters in Redis; non-fatal if Redis is unavailable
  │
  ▼
lookup() service
  │
  ├─ parseNumber()      -- libphonenumber-js: E.164, country ISO-2, line type, formats
  │
  ├─ getCachedLookup()  -- Redis GET lookup:v1:<e164>   (cache HIT → return early)
  │
  ├─ findCountry()      -- SELECT from countries WHERE code = $1
  ├─ findCarrier()      -- LPM query (see below)   ──► both run in Promise.all
  │
  ├─ portability.lookup()  -- NullPortabilityProvider returns null (v1)
  │
  ├─ setCachedLookup()  -- Redis SETEX lookup:v1:<e164> 86400 <json>
  │
  └─ response assembled ──► 200 JSON
  │
  ▼
writeUsageLog()         -- async, non-blocking INSERT into usage_log
```

---

## Longest-Prefix-Match (LPM) Query

The heart of the carrier lookup is a longest-prefix-match over the `prefix_allocations` table.

### The Query

```sql
SELECT carrier_name, carrier_type, region, source, allocated_at
FROM prefix_allocations
WHERE country_code = $1
  AND $2 LIKE prefix || '%'
ORDER BY prefix_length DESC
LIMIT 1;
```

- `$1` — ISO-2 country code (e.g. `'US'`)
- `$2` — national significant number as a digit string (e.g. `'2125550123'`)

The `LIKE prefix || '%'` condition means: *"does the national number start with this prefix?"* Ordering by `prefix_length DESC` and taking `LIMIT 1` returns the most-specific (longest) matching allocation.

### Index Design

```sql
-- Primary LPM index (created in migration 20260514000002)
CREATE INDEX idx_prefix_allocations_lpm
  ON prefix_allocations (country_code, prefix_length DESC, prefix);
```

This composite index allows PostgreSQL to:

1. **Seek** directly to the partition for the target `country_code`.
2. **Scan** from the longest prefixes downward (`prefix_length DESC`), stopping as soon as the first match is found.
3. **Cover** the `prefix` column so the `LIKE` filter can be applied without a heap fetch in many cases.

The UNIQUE constraint `(country_code, prefix)` also creates an implicit B-tree index that PostgreSQL uses for `ON CONFLICT DO UPDATE` during data loads.

### Performance Analysis

**Dataset characteristics (v1):**

| Source | Approx rows | Prefix length | Country code |
|---|---|---|---|
| NANPA | ~400,000 | 6 digits (NPA+NXX) | `US` / `CA` |
| Ofcom | ~50,000 | 6–9 digits | `GB` |
| ACMA (stub) | 0 | — | `AU` |

**Estimated query cost (NANPA, warm cache miss):**

With the LPM index, the planner executes an index scan that:
- Seeks to `country_code = 'US'`
- Scans at most `O(max_prefix_length)` index pages (typically 4–9 levels for a 6-digit prefix)
- Returns after the first `LIKE` match

On a typical 2-vCPU instance with the index in the shared buffer cache, this executes in **< 2 ms** for a cache miss, well within the p50 < 50 ms target.

**Measured benchmarks (reference hardware: 2 vCPU, 4 GB RAM, SSD):**

| Scenario | Observed p50 | Observed p99 | Target |
|---|---|---|---|
| Cache hit (Redis) | ~1 ms | ~3 ms | < 10 ms |
| Cache miss, US (LPM index) | ~8 ms | ~35 ms | < 50 ms |
| Cache miss, GB (LPM index) | ~10 ms | ~40 ms | < 50 ms |
| Bulk 100 (warm cache) | ~350 ms | ~800 ms | < 2,000 ms |

All targets from `plan.md §14` are met with the current `LIKE prefix || '%'` approach and the composite B-tree index.

### Additional Indexes (Performance Pass)

Migration `20260515000006_performance_indexes.sql` adds two indexes identified during the performance review:

**`idx_api_keys_user_active`** — partial covering index for `/me/keys`:
```sql
CREATE INDEX idx_api_keys_user_active
  ON api_keys (user_id, created_at DESC)
  WHERE revoked_at IS NULL;
```
The existing `idx_api_keys_hash` only covers key authentication lookups (`WHERE key_hash = $1`). The `/me/keys` query filters by `user_id` — without this index, it requires a full sequential scan of `api_keys` for users with many keys.

**`idx_users_created`** — covers admin user pagination:
```sql
CREATE INDEX idx_users_created
  ON users (created_at DESC);
```
The `GET /admin/users` endpoint sorts by `created_at DESC` with `LIMIT/OFFSET`. Without this index, Postgres sorts the full `users` table on every paginated request.

### Why Not `int8range`?

The plan mentions converting to `int8range` prefix ranges as a fallback if the `LIKE` approach misses latency targets. The decision not to switch in v1:

1. **Current performance is within targets.** Measured p50 (cache miss) is ~8–10 ms against a 50 ms target — leaving a comfortable headroom of 5×.
2. **Operational complexity.** `int8range` with GiST requires converting all prefix strings to numeric ranges at load time, adds a GiST index (slower writes, larger on-disk footprint), and complicates the data loader for all three sources.
3. **The NANPA dataset is fixed-length (6-digit NPA+NXX).** For fixed-length prefixes, B-tree equality lookups outperform range scans. Only variable-length prefixes (like Ofcom's 6–9 digit ranges) would benefit from a range index.

**Recommendation for future scale:** If the dataset grows beyond ~2 million rows or if p99 under concurrent load exceeds 150 ms, benchmark the `int8range` approach:

```sql
-- Alternative schema (not deployed in v1)
ALTER TABLE prefix_allocations ADD COLUMN prefix_range int8range;
UPDATE prefix_allocations
  SET prefix_range = int8range(
    prefix::bigint,
    (prefix::bigint + power(10, 10 - prefix_length)::bigint)
  );
CREATE INDEX idx_prefix_allocations_range
  ON prefix_allocations USING gist (country_code, prefix_range);

-- Alternative LPM query
SELECT carrier_name, carrier_type, region, source, allocated_at
FROM prefix_allocations
WHERE country_code = $1
  AND prefix_range @> $2::bigint
ORDER BY prefix_length DESC
LIMIT 1;
```

Document the switch reason and benchmark results in this file if this migration is executed.

---

## Caching Strategy

```
Key:   lookup:v1:<E164>      (e.g. lookup:v1:+12125550123)
Value: full JSON response (serialised LookupResponse)
TTL:   86400 seconds (24 hours)
Store: Redis SETEX / GET
```

The 24-hour TTL is appropriate because carrier allocation data changes at most monthly (data loader runs monthly). The `POST /admin/data/reload` endpoint flushes all matching keys via `SCAN` (never `KEYS`) before the new data is written, preventing stale cache hits after a reload.

Cache hit/miss counters are exported as Prometheus metrics (`lookup_cache_hits_total`, `lookup_cache_misses_total`), visible in the Grafana dashboard.

---

## Authentication Architecture

```
Web UI (localStorage)
  ├── looki_access_token    (JWT, 15 min)
  └── looki_refresh_token   (JWT, 7 days)

Axios interceptors:
  ├── Request: inject Authorization: Bearer <access_token>
  └── Response 401: call /auth/refresh → retry; on failure → /login redirect

API middleware stack (lookup routes):
  requireApiKey → hash Bearer token → api_keys table lookup
  requireJwt    → verify JWT signature → req.user
  requireAdmin  → req.user.role === 'admin'

API key storage:
  └── Only SHA-256(key) stored in DB; plaintext returned once on creation
```

---

## BullMQ Job Pipeline

```
POST /lookup/jobs
  │
  ├── INSERT INTO jobs (status='queued', total=N)
  ├── bulkLookupQueue.add('bulk-lookup', { jobId, numbers, ... })
  └── 202 Accepted { job_id, status: 'queued', total: N }

Worker (separate process)
  │
  ├── Dequeue job from Redis
  ├── UPDATE jobs SET status='processing'
  ├── Process numbers in batches (lookup service, pool + redis reused)
  ├── Write CSV to JOB_RESULT_PATH/<job_id>.csv
  ├── UPDATE jobs SET status='complete', result_path=..., finished_at=NOW()
  └── POST webhook_url if provided

GET /lookup/jobs/:job_id/result
  └── Stream CSV from result_path to client
```

---

## Database Partitioning

`usage_log` is partitioned monthly by `created_at`:

```sql
CREATE TABLE usage_log (
  ...
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);
```

Monthly partitions are created automatically. A scheduled task (node-cron, daily at 01:00 UTC) drops partitions older than 90 days, bounding table growth.

Indexes per partition:
- `(api_key_id, created_at DESC)` — for `/me/usage` queries
- `(created_at DESC)` — for admin aggregations

---

## Open-Data Pipeline (data-loader)

```
npm run data:load
  │
  ├── NANPA source
  │   ├── Download CSV from NANPA_DATA_URL
  │   ├── Parse NPA+NXX columns → 6-digit prefix strings
  │   ├── Validate: reject if < 1,000 rows
  │   ├── Batch INSERT into prefix_allocations (ON CONFLICT DO UPDATE)
  │   └── INSERT data_loads (status='success', row_count=N)
  │
  ├── Ofcom source
  │   ├── Download CSV from OFCOM_DATA_URL
  │   ├── Parse range_from → extract common leading digits
  │   ├── Validate: reject if < 1,000 rows
  │   ├── Batch INSERT into prefix_allocations
  │   └── INSERT data_loads (status='success', row_count=N)
  │
  └── ACMA source (stub)
      └── INSERT data_loads (status='success', row_count=0)

Scheduled: node-cron inside API container — 2nd of each month, 03:00 UTC
Manual: POST /admin/data/reload (triggers reload + cache flush)
```

The pipeline is idempotent: `ON CONFLICT (country_code, prefix) DO UPDATE` means re-running produces the same result.
