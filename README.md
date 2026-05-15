# Looki — Phone Number Intelligence Service

Looki is a self-hostable web service that accepts a phone number and returns structured intelligence: country, region, line type, formatted representations, and the original carrier allocation.

> **Portability disclaimer:** This service returns the original carrier the number block was allocated to. Real-time portability requires integration with a paid upstream provider, which the architecture supports via a pluggable lookup module.

---

## Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Data Loading](#data-loading)
- [Development](#development)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [Observability](#observability)

---

## Quick Start

```bash
# 1. Clone and configure
git clone https://github.com/Muhammad-FRAX/looki.git
cd looki
cp .env.example .env

# 2. Edit .env — at minimum change secrets and set data URLs
#    JWT_ACCESS_SECRET=<32+ chars>
#    JWT_REFRESH_SECRET=<32+ chars>
#    NANPA_DATA_URL=<url or file:// path to NANPA CSV>
#    OFCOM_DATA_URL=<url or file:// path to Ofcom CSV>

# 3. Start the full stack
docker compose up

# 4. Load prefix data (in a separate terminal)
docker compose run --profile loader data-loader

# 5. Verify
curl http://localhost:3000/api/v1/health
# → {"status":"ok"}
```

The web UI is available at `http://localhost:80`. The REST API is at `http://localhost:3000/api/v1`. Swagger UI is at `http://localhost:3000/api/v1/docs`.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Client Browser                      │
└─────────────────┬───────────────────┬───────────────────┘
                  │ :80               │ :80/api → :3000
        ┌─────────▼─────────┐         │
        │   nginx (web)     │         │
        │  React 18 + Vite  │         │
        └───────────────────┘         │
                                      │
                    ┌─────────────────▼─────────────┐
                    │         Express API (api)      │
                    │   Node.js 20 · TypeScript      │
                    │                               │
                    │  ┌──────────────────────────┐ │
                    │  │    Lookup Service         │ │
                    │  │  parse → cache → DB → log │ │
                    │  └──────────────────────────┘ │
                    │  ┌──────────────────────────┐ │
                    │  │    BullMQ Worker          │ │
                    │  │  async bulk job queue     │ │
                    │  └──────────────────────────┘ │
                    └──────────┬────────┬───────────┘
                               │        │
               ┌───────────────▼──┐  ┌──▼────────────────┐
               │  PostgreSQL 16   │  │    Redis 7         │
               │                  │  │                    │
               │ prefix_alloc.    │  │ lookup cache       │
               │ users/keys       │  │ rate limit counters│
               │ usage_log        │  │ BullMQ queues      │
               │ jobs             │  └────────────────────┘
               └──────────────────┘
```

### Component Responsibilities

| Component | Role |
|---|---|
| `apps/api` | Express REST API, JWT auth, lookup orchestration, job queue |
| `apps/web` | React 18 SPA — lookup UI, dashboard, admin, key management |
| `apps/data-loader` | One-shot CLI to ingest NANPA / Ofcom / ACMA prefix data |
| `packages/shared` | TypeScript types shared between api and web |
| `postgres` | Primary data store — prefix allocations, users, usage logs |
| `redis` | Cache (lookup results, 24h TTL), sliding-window rate limiting, BullMQ |

See [`docs/architecture.md`](docs/architecture.md) for a deep-dive on the lookup pipeline and LPM query design.

---

## API Reference

All endpoints are prefixed `/api/v1`. All responses are JSON.

### Meta (public)

```bash
# Health check
curl http://localhost:3000/api/v1/health
# → {"status":"ok"}

# Readiness (checks Postgres + Redis connectivity)
curl http://localhost:3000/api/v1/ready
# → {"status":"ok","postgres":true,"redis":true}

# Prometheus metrics
curl http://localhost:3000/api/v1/metrics

# OpenAPI spec (raw JSON)
curl http://localhost:3000/api/v1/openapi.json

# Swagger UI (browser)
open http://localhost:3000/api/v1/docs
```

### Authentication

```bash
# Register a new account
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"securepassword123"}'
# → {"access_token":"eyJ...","refresh_token":"eyJ...","user":{"id":"...","email":"...","role":"user"}}

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"securepassword123"}'

# Refresh access token
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"eyJ..."}'

# Logout (revoke refresh token)
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"eyJ..."}'
```

### API Keys

```bash
# Create an API key (requires JWT)
ACCESS_TOKEN="eyJ..."
curl -X POST http://localhost:3000/api/v1/me/keys \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"my-integration"}'
# → {"id":"...","name":"my-integration","key":"pi_live_XXXXXXXXXXXXXXXX","prefix":"pi_live_XX","tier":"free","created_at":"..."}
# The full key is returned exactly once — store it securely.

# List your API keys
curl http://localhost:3000/api/v1/me/keys \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Revoke an API key
curl -X DELETE http://localhost:3000/api/v1/me/keys/<key_id> \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Phone Number Lookup (requires API key)

```bash
API_KEY="pi_live_XXXXXXXXXXXXXXXX"

# Single lookup — E.164 format (URL-encode the + sign)
curl "http://localhost:3000/api/v1/lookup?number=%2B12125550123" \
  -H "Authorization: Bearer $API_KEY"
```

**Example response:**

```json
{
  "input": "+12125550123",
  "valid": true,
  "e164": "+12125550123",
  "national_format": "(212) 555-0123",
  "international_format": "+1 212-555-0123",
  "country": {
    "code": "US",
    "name": "United States",
    "calling_code": "1"
  },
  "line_type": "fixed_line",
  "region": "New York, NY",
  "carrier": {
    "name": "Verizon New York Inc.",
    "type": "incumbent_local_exchange_carrier",
    "source": "NANPA",
    "allocated_at": "1947-10-01"
  },
  "portability": {
    "checked": false,
    "note": "Real-time portability requires a paid upstream. Returned carrier is the original allocation."
  },
  "cached": false,
  "lookup_id": "01HXX..."
}
```

```bash
# Lookup with country hint (useful for local-format numbers)
curl "http://localhost:3000/api/v1/lookup?number=07911123456&country=GB" \
  -H "Authorization: Bearer $API_KEY"

# Bulk lookup — up to 1,000 numbers synchronously
curl -X POST http://localhost:3000/api/v1/lookup/bulk \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "numbers": ["+12125550123", "+442071838750", "+61299999999"],
    "country": "US"
  }'
# → Array of LookupResponse objects (same shape as single lookup)
```

### Async Jobs (large batches)

```bash
# Submit an async job (up to 1,000,000 numbers)
JOB=$(curl -s -X POST http://localhost:3000/api/v1/lookup/jobs \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"numbers":["+12125550123","+442071838750"],"webhook_url":"https://example.com/hook"}')

JOB_ID=$(echo "$JOB" | jq -r .job_id)
echo "Job: $JOB_ID"

# Or submit via CSV file upload
curl -X POST http://localhost:3000/api/v1/lookup/jobs \
  -H "Authorization: Bearer $API_KEY" \
  -F "file=@numbers.csv"

# Poll for status
curl "http://localhost:3000/api/v1/lookup/jobs/$JOB_ID" \
  -H "Authorization: Bearer $API_KEY"
# → {"job_id":"...","status":"processing","total":2,"processed":1,...}

# Download CSV result when complete
curl "http://localhost:3000/api/v1/lookup/jobs/$JOB_ID/result" \
  -H "Authorization: Bearer $API_KEY" \
  -o results.csv
```

### Account & Usage

```bash
# Current user
curl http://localhost:3000/api/v1/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Daily usage counts (past 30 days by default)
curl "http://localhost:3000/api/v1/me/usage?from=2026-04-01&to=2026-04-30" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Admin Endpoints (JWT + admin role)

```bash
ADMIN_TOKEN="eyJ..."  # admin user's access token

# System statistics
curl http://localhost:3000/api/v1/admin/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Paginated user list
curl "http://localhost:3000/api/v1/admin/users?page=1&limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Trigger prefix data reload + flush cache
curl -X POST http://localhost:3000/api/v1/admin/data/reload \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Authentication

The service uses **JWT Bearer tokens** throughout:

- **Access token** — short-lived (15 min), passed as `Authorization: Bearer <token>` on every request.
- **Refresh token** — long-lived (7 days), stored server-side for revocation. Exchange at `/auth/refresh` for a new access token.
- **API key** — for programmatic lookup access. Format: `pi_live_<base32>`. Only the SHA-256 hash is stored in the database; the plaintext key is returned exactly once on creation.

The web UI stores both tokens in `localStorage` under `looki_access_token` and `looki_refresh_token`. The Axios client intercepts 401 responses, attempts a silent refresh, and redirects to `/login` if that fails.

---

## Rate Limiting

All limits are per API key, enforced in Redis with sliding-window (per-minute) and fixed-window (per-day, per-month) counters.

| Window | Free tier |
|---|---|
| Per minute | 60 requests |
| Per day | 1,000 requests |
| Per month | 10,000 requests |

- **Bulk requests** count as `numbers.length` units against all windows.
- **Jobs** count as 1 per-minute at submission; full `numbers.length` is charged per-day/per-month on completion.
- **Anonymous demo** (landing page): 5 lookups/hour/IP.
- **Login attempts**: 10/hour/IP.

Rate-limited responses return HTTP 429 with a `Retry-After` header and `{ "error": { "code": "RATE_LIMITED" } }`.

Every successful response includes:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1715000000
```

Redis is optional. When unavailable, rate limiting falls back gracefully (requests pass through).

---

## Data Loading

Looki uses open, freely-licensed carrier allocation data:

| Source | Country | License |
|---|---|---|
| NANPA | +1 (US/CA) | Public domain |
| Ofcom | +44 (UK) | Open Government Licence v3.0 |
| ACMA (stub) | +61 (AU) | Creative Commons Attribution |

See [`docs/data-sources.md`](docs/data-sources.md) for download instructions and CSV format details.

```bash
# Run the data loader (requires NANPA_DATA_URL and OFCOM_DATA_URL in .env)
docker compose run --profile loader data-loader

# Or schedule: the API container auto-runs the loader at 03:00 UTC on the 2nd of each month.
# Trigger a manual reload (flushes lookup cache):
curl -X POST http://localhost:3000/api/v1/admin/data/reload \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Development

### Prerequisites

- Docker Desktop (or Docker Engine + Compose plugin)
- Node.js 20 LTS (for running workspace scripts outside Docker)

### Full Stack with Hot Reload

```bash
# Hot reload: tsx watch (API) + Vite dev server (web)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

API hot-reloads on file changes. The Vite dev server proxies `/api` to the API container.

### Minimal Stack (API + Postgres, no Redis)

```bash
docker compose -f docker-compose.minimal.yml up
```

Rate limiting and caching degrade gracefully — requests pass through without Redis.

### Running Tests

```bash
# All workspace tests
npm test

# API tests only
cd apps/api && npm test

# With coverage
cd apps/api && npm run test:coverage
```

Tests use a separate `looki_test` database. The integration tests boot a real Postgres instance (no mocks). See `apps/api/vitest.config.ts` for configuration.

### E2E Smoke Test

```bash
# Boots the full stack, runs ~13 health/auth/lookup checks
./scripts/e2e-smoke.sh
```

### Workspace Structure

```
apps/
  api/          Express REST API (Node.js 20, TypeScript, Vitest)
  web/          React 18 SPA (Vite 5, Ant Design 5, TanStack Query)
  data-loader/  Open-data ingestion CLI
packages/
  shared/       TypeScript types shared between api and web
docs/
  architecture.md   Component diagram, LPM design, performance
  data-sources.md   Data source URLs, licenses, CSV formats
scripts/
  e2e-smoke.sh      End-to-end smoke test script
  seed-dev.ts       Seed admin user + sample data for development
```

---

## Deployment

### Docker Compose (Recommended)

```bash
cp .env.example .env
# Edit .env — set strong JWT secrets and data source URLs
docker compose up -d
docker compose run --profile loader data-loader
```

Services:
- `postgres` — PostgreSQL 16 with persistent volume
- `redis` — Redis 7 with AOF persistence
- `api` — Node.js API on port 3000
- `web` — nginx-served React SPA on port 80
- `worker` — BullMQ worker (reads from same Redis)
- `data-loader` — one-shot loader (profile: `loader`)

### Reverse Proxy / TLS

In production, place nginx or Caddy in front and terminate TLS there. Example nginx snippet:

```nginx
server {
    listen 443 ssl;
    server_name looki.example.com;

    ssl_certificate     /etc/ssl/looki.crt;
    ssl_certificate_key /etc/ssl/looki.key;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
    }
}
```

Update `CORS_ALLOWED_ORIGINS` in `.env` to match your public domain.

### Observability Stack (Optional)

```bash
# Adds Prometheus + Grafana with a pre-built dashboard
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
```

Grafana is available at `http://localhost:3001` (default: admin/admin). The dashboard shows HTTP latency histograms, cache hit ratio, queue depth, and DB pool utilisation.

---

## Configuration

All configuration is via environment variables. Copy `.env.example` to `.env` and edit.

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | (required) | PostgreSQL connection string |
| `REDIS_URL` | (optional) | Redis connection string — omit to disable caching/rate limiting |
| `JWT_ACCESS_SECRET` | `change-me-access` | **Change in production** — HS256 secret for access tokens |
| `JWT_REFRESH_SECRET` | `change-me-refresh` | **Change in production** — HS256 secret for refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token lifetime |
| `PORT` | `3000` | API listen port |
| `NODE_ENV` | `production` | `development` enables pretty logs and disables some security headers |
| `CORS_ALLOWED_ORIGINS` | `http://localhost` | Comma-separated list of allowed origins |
| `ADMIN_EMAIL` | `admin@looki.local` | Email for the seeded admin account |
| `ADMIN_PASSWORD` | `change-me` | **Change in production** |
| `RATE_LIMIT_PER_MINUTE` | `60` | Free tier: requests per minute per API key |
| `RATE_LIMIT_PER_DAY` | `1000` | Free tier: requests per day per API key |
| `RATE_LIMIT_PER_MONTH` | `10000` | Free tier: requests per month per API key |
| `DEMO_RATE_LIMIT_PER_HOUR` | `5` | Anonymous demo lookups per hour per IP |
| `NANPA_DATA_URL` | _(empty)_ | URL or `file://` path to NANPA NXX assignment CSV |
| `OFCOM_DATA_URL` | _(empty)_ | URL or `file://` path to Ofcom allocated number ranges CSV |
| `JOB_RESULT_PATH` | `/data/jobs` | Directory for async job CSV result files |
| `SKIP_AUTH` | `false` | Bypass API key auth — **never enable in production** |

---

## Observability

- **Logs** — Pino JSON in production (`NODE_ENV=production`), pretty-printed in development. Every log line includes `request_id` (ULID), also returned as `X-Request-Id` response header.
- **Metrics** — Prometheus format at `/api/v1/metrics`:
  - `http_requests_total` — by route, method, status code
  - `http_request_duration_ms` — histogram by route, method, status code
  - `lookup_cache_hits_total` / `lookup_cache_misses_total`
  - `bullmq_queue_depth` — active + waiting jobs
  - `pg_pool_total` / `pg_pool_idle` / `pg_pool_waiting`

---

## License

MIT
