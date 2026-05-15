# Looki — Phone Number Intelligence Service

## Implementation Plan

> **Auth correction:** Both the web UI and the REST API use **JWT (Bearer tokens)**. The web UI stores `access_token` and `refresh_token` in `localStorage`. The API expects `Authorization: Bearer <token>`. There are no server-side sessions.

---

## 1. Project Summary

**Looki** is a self-hostable web service that accepts a phone number and returns structured intelligence: country, region, line type, formatted representations, and the original carrier allocation.

The service exposes:

1. A versioned REST API (`/api/v1`) for programmatic use.
2. A React web UI for interactive lookups and account management.
3. An admin dashboard for usage analytics.

Everything runs on the operator's own infrastructure via Docker Compose — no external paid APIs, no AI/ML dependencies.

> **Portability disclaimer (must appear verbatim in README):**
> "This service returns the original carrier the number block was allocated to. Real-time portability requires integration with a paid upstream provider, which the architecture supports via a pluggable lookup module."

---

## 2. Technology Stack

### Backend

| Layer                    | Choice                         | Reason                                                |
| ------------------------ | ------------------------------ | ----------------------------------------------------- |
| Language                 | TypeScript on Node.js 20 LTS   | Type safety, modern JS ecosystem                      |
| Framework                | Express 4.x                    | Stable, well-known, minimal overhead                  |
| Database                 | PostgreSQL 16                  | Relational range-based queries, referential integrity |
| Cache / Rate-limit store | Redis 7                        | Sliding-window rate limiting, response caching        |
| Job queue                | BullMQ (on Redis)              | Async bulk job processing                             |
| Phone parsing            | libphonenumber-js              | Industry-standard ITU country code data               |
| Auth                     | JWT (jsonwebtoken)             | Access + refresh token pair, stored in localStorage   |
| Password hashing         | argon2id (argon2 npm)          | OWASP-recommended, default parameters                 |
| Migrations               | node-pg-migrate                | Plain SQL, no ORM lock-in                             |
| Query layer              | pg driver + repository pattern | No ORM, explicit tunable SQL                          |
| Logging                  | Pino                           | Fast structured logging; pretty in dev, JSON in prod  |
| Validation               | Zod                            | Schema-first, every endpoint body/query/params        |
| API docs                 | OpenAPI 3.1 + Swagger UI       | Served at `/docs` and `/openapi.json`                 |
| Metrics                  | prom-client                    | Prometheus endpoint at `/metrics`                     |
| Scheduler                | node-cron                      | Monthly data reload inside API container              |
| ULID                     | ulidx                          | Collision-resistant sortable IDs                      |

### Frontend

| Layer             | Choice                                                          |
| ----------------- | --------------------------------------------------------------- |
| Framework         | React 18 (functional components only)                           |
| Language          | TypeScript ~5.6 (strict, no `any` in feature code)              |
| Build tool        | Vite 5.x                                                        |
| Routing           | React Router 6.x                                                |
| Component library | Ant Design 5                                                    |
| Icons             | @ant-design/icons only                                          |
| Utility CSS       | Tailwind CSS 4 (layout/spacing only — colors via CSS variables) |
| Charts            | ECharts 5 via echarts-for-react                                 |
| Server state      | TanStack React Query 5                                          |
| HTTP client       | Axios (JWT interceptors)                                        |
| Dates             | dayjs                                                           |
| Export            | xlsx (SheetJS)                                                  |

### Infrastructure

| Component                   | Details                                                    |
| --------------------------- | ---------------------------------------------------------- |
| Docker Compose (production) | `app` container (API + frontend) + `postgres` container    |
| Docker Compose (full)       | Adds `redis` container + optional `worker` + `data-loader` |
| Reverse proxy               | nginx:alpine inside app container, proxies `/api` to Node  |
| Process manager             | Node directly — no PM2 inside Docker                       |

> **Current baseline:** Two containers — `app` (Node.js API + nginx-served frontend) and `postgres`. Redis is added as a third container for caching and rate limiting. The full production compose adds `redis`, `worker`, and `data-loader` services.

---

## 3. Repository Structure

```
looki/
├── docker-compose.yml            # Production: postgres + redis + api + web + worker
├── docker-compose.dev.yml        # Dev overlay: bind mounts, hot reload
├── docker-compose.minimal.yml    # Minimal: app + postgres (entry point for dev)
├── .env.example                  # All env vars with defaults and comments
├── .dockerignore
├── README.md
├── plan.md                       # This file
├── LICENSE
├── docs/
│   ├── architecture.md           # Component diagram, data flow, LPM design
│   ├── data-sources.md           # NANPA, Ofcom, ACMA — URLs, licenses, cadence
│   └── deployment.md             # Reverse proxy, TLS, env vars, backups
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── index.ts          # Entry point: starts server + worker
│   │   │   ├── server.ts         # Express app factory
│   │   │   ├── config.ts         # Env parsing with Zod
│   │   │   ├── db/
│   │   │   │   ├── pool.ts       # pg Pool instance
│   │   │   │   └── migrations/   # node-pg-migrate SQL files
│   │   │   ├── redis/
│   │   │   │   └── client.ts     # ioredis instance with reconnect
│   │   │   ├── auth/
│   │   │   │   ├── jwt.ts        # sign / verify access & refresh tokens
│   │   │   │   ├── apiKey.ts     # Bearer API key middleware
│   │   │   │   └── password.ts   # argon2id wrapper
│   │   │   ├── lookup/
│   │   │   │   ├── service.ts    # Orchestrator: parse → cache → DB → log
│   │   │   │   ├── parser.ts     # libphonenumber-js wrapper
│   │   │   │   ├── carrierRepo.ts# Longest-prefix-match SQL
│   │   │   │   ├── cache.ts      # Redis get/set for lookup:v1:<E164>
│   │   │   │   ├── portability.ts# PortabilityProvider interface + NullImpl
│   │   │   │   └── types.ts      # LookupResponse, LookupError, LineType enum
│   │   │   ├── jobs/
│   │   │   │   ├── queue.ts      # BullMQ queue setup
│   │   │   │   └── worker.ts     # Bulk job processor
│   │   │   ├── routes/
│   │   │   │   ├── lookup.ts     # GET /lookup, POST /lookup/bulk, /jobs
│   │   │   │   ├── auth.ts       # POST /auth/register, /login, /refresh, /logout
│   │   │   │   ├── me.ts         # GET /me, /me/keys, /me/usage
│   │   │   │   ├── admin.ts      # GET /admin/stats, /admin/users, /admin/data/reload
│   │   │   │   └── meta.ts       # GET /health, /ready, /metrics, /docs
│   │   │   ├── middleware/
│   │   │   │   ├── rateLimit.ts  # Sliding-window Redis rate limiter
│   │   │   │   ├── requestId.ts  # ULID per request, X-Request-Id header
│   │   │   │   ├── errorHandler.ts
│   │   │   │   └── logger.ts     # Pino HTTP logger
│   │   │   └── openapi/
│   │   │       └── spec.ts       # Programmatic OpenAPI 3.1 spec
│   │   ├── test/
│   │   │   ├── unit/             # Parser, carrier repo, cache, rate limiter, auth
│   │   │   └── integration/      # Every endpoint — happy path + error paths
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── Dockerfile            # Multi-stage: builder → node:20-alpine
│   ├── web/
│   │   ├── src/
│   │   │   ├── main.tsx          # Provider wrapping order
│   │   │   ├── App.tsx           # Route definitions
│   │   │   ├── index.css         # CSS variables + Ant Design overrides + scrollbar
│   │   │   ├── api/
│   │   │   │   ├── client.ts     # Axios: JWT interceptor, 401 → /login redirect
│   │   │   │   └── types.ts      # Shared API response types
│   │   │   ├── auth/
│   │   │   │   ├── auth.types.ts
│   │   │   │   ├── AuthContext.tsx
│   │   │   │   ├── AuthProvider.tsx
│   │   │   │   └── adapters/
│   │   │   │       └── prodAuth.ts  # JWT via /api/v1/auth/login
│   │   │   ├── components/
│   │   │   │   ├── ui/
│   │   │   │   │   ├── KpiCardV2.tsx
│   │   │   │   │   ├── PageHeader.tsx
│   │   │   │   │   ├── DataTable.tsx
│   │   │   │   │   ├── ResponsiveChart.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   ├── ProtectedRoute.tsx
│   │   │   │   ├── AdminRoute.tsx
│   │   │   │   └── ThemeToggle.tsx
│   │   │   ├── contexts/
│   │   │   │   ├── ThemeContext.tsx   # light/dark; persisted to localStorage
│   │   │   │   └── SidebarContext.tsx
│   │   │   ├── features/
│   │   │   │   ├── lookup/           # Single lookup + bulk tab
│   │   │   │   │   ├── LookupPage.tsx
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── LookupForm.tsx
│   │   │   │   │   │   ├── ResultCard.tsx
│   │   │   │   │   │   ├── BulkTab.tsx
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   └── hooks/
│   │   │   │   │       └── useLookup.ts
│   │   │   │   ├── dashboard/        # Usage chart + API key list
│   │   │   │   │   ├── DashboardPage.tsx
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── UsageChart.tsx
│   │   │   │   │   │   ├── ApiKeyList.tsx
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   └── hooks/
│   │   │   │   │       └── useDashboard.ts
│   │   │   │   ├── keys/             # Create / revoke API keys
│   │   │   │   │   ├── KeysPage.tsx
│   │   │   │   │   └── components/
│   │   │   │   │       ├── CreateKeyModal.tsx
│   │   │   │   │       └── index.ts
│   │   │   │   └── admin/            # Admin stats + user management
│   │   │   │       ├── AdminPage.tsx
│   │   │   │       └── components/
│   │   │   │           ├── StatsGrid.tsx
│   │   │   │           ├── UsersTable.tsx
│   │   │   │           └── index.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useResponsive.ts  # Breakpoint flags + responsive values
│   │   │   │   └── index.ts
│   │   │   ├── layouts/
│   │   │   │   └── AppLayout.tsx     # Sidebar + header + content shell
│   │   │   ├── pages/
│   │   │   │   ├── Landing.tsx       # / — demo lookup, 5/hour anonymous limit
│   │   │   │   ├── Login.tsx
│   │   │   │   ├── Register.tsx
│   │   │   │   └── Docs.tsx          # Embeds Swagger UI iframe
│   │   │   └── theme/
│   │   │       ├── tokens.ts         # Brand anchors + semantic tokens
│   │   │       ├── darkTheme.ts      # Ant Design dark ThemeConfig
│   │   │       ├── lightTheme.ts     # Ant Design light ThemeConfig
│   │   │       ├── echarts.ts        # ECharts theme from tokens
│   │   │       └── index.ts
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   └── Dockerfile                # Multi-stage: vite build → nginx:alpine
│   └── data-loader/
│       ├── src/
│       │   ├── index.ts              # CLI entry: npm run data:load
│       │   ├── pipeline.ts           # Download → validate → stage → swap
│       │   └── sources/
│       │       ├── nanpa.ts          # NANPA +1 allocations
│       │       ├── ofcom.ts          # Ofcom +44 numbering plan
│       │       └── acma.ts           # ACMA Australia stub
│       ├── package.json
│       ├── tsconfig.json
│       └── Dockerfile
├── packages/
│   └── shared/
│       ├── src/
│       │   └── index.ts              # Shared TypeScript types (API + web)
│       └── package.json
└── scripts/
    ├── seed-dev.ts                   # Seed admin user + sample data
    └── load-sample-data.sh
```

---

## 4. Authentication Design (JWT)

### Token Strategy

- **Access token:** Short-lived (15 min), signed HS256, payload `{ sub: userId, role, jti }`.
- **Refresh token:** Long-lived (7 days), stored in the DB (`refresh_tokens` table) for revocation. Payload `{ sub: userId, jti }`.
- **Storage:** Both tokens in `localStorage` under keys `looki_access_token` and `looki_refresh_token`.
- **API key auth (programmatic):** `Authorization: Bearer pi_live_<base32>` — looked up by SHA-256 hash.

### Auth Endpoints

| Method | Path                    | Description                                                 |
| ------ | ----------------------- | ----------------------------------------------------------- |
| POST   | `/api/v1/auth/register` | Create user, return `{ access_token, refresh_token, user }` |
| POST   | `/api/v1/auth/login`    | Verify credentials, return tokens                           |
| POST   | `/api/v1/auth/refresh`  | Body: `{ refresh_token }` → new access token                |
| POST   | `/api/v1/auth/logout`   | Body: `{ refresh_token }` → revoke refresh token in DB      |

### Axios Interceptors (frontend)

```ts
// Request: attach access token
config.headers.Authorization = `Bearer ${localStorage.getItem(
  "looki_access_token"
)}`;

// Response: on 401, try /auth/refresh; if that fails, redirect to /login
```

### Middleware Stack (backend)

```
requireJwt     — verifies JWT, sets req.user (for web UI routes)
requireApiKey  — hashes Bearer token, looks up api_keys, sets req.apiKey (for /lookup)
requireAdmin   — checks req.user.role === 'admin'
```

---

## 5. Data Model

All tables in `public` schema. All timestamps `TIMESTAMPTZ`. Primary keys are ULIDs as `TEXT(26)`.

### `users`

```sql
id            TEXT PRIMARY KEY
email         CITEXT UNIQUE NOT NULL
password_hash TEXT NOT NULL                   -- argon2id
role          TEXT NOT NULL DEFAULT 'user'    -- 'user' | 'admin'
created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### `refresh_tokens`

```sql
id         TEXT PRIMARY KEY                   -- ULID = jti
user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
revoked_at TIMESTAMPTZ
expires_at TIMESTAMPTZ NOT NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

Index: `(user_id)` where `revoked_at IS NULL AND expires_at > NOW()`.

### `api_keys`

```sql
id           TEXT PRIMARY KEY
user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
name         TEXT NOT NULL
key_hash     TEXT NOT NULL UNIQUE             -- sha256 hex
key_prefix   TEXT NOT NULL                   -- first 8 chars for display
tier         TEXT NOT NULL DEFAULT 'free'
revoked_at   TIMESTAMPTZ
last_used_at TIMESTAMPTZ
created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

Index: `(key_hash) WHERE revoked_at IS NULL`.

### `countries`

```sql
code         CHAR(2) PRIMARY KEY              -- ISO 3166-1 alpha-2
name         TEXT NOT NULL
calling_code TEXT NOT NULL                   -- '1', '44', '61'
```

Seeded from static JSON in migration.

### `prefix_allocations`

```sql
id            BIGSERIAL PRIMARY KEY
country_code  CHAR(2) NOT NULL REFERENCES countries(code)
prefix        TEXT NOT NULL                  -- national significant digits, e.g. '212555'
prefix_length INTEGER NOT NULL              -- denormalized for ORDER BY
carrier_name  TEXT
carrier_type  TEXT
region        TEXT
source        TEXT NOT NULL                 -- 'NANPA' | 'OFCOM' | 'ACMA'
allocated_at  DATE
loaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

Indexes:

- `(country_code, prefix_length DESC, prefix)` — longest-prefix-match scan
- `UNIQUE (country_code, prefix)`

**Longest-prefix-match query (the heart of the service):**

```sql
SELECT carrier_name, carrier_type, region, source, allocated_at
FROM prefix_allocations
WHERE country_code = $1
  AND $2 LIKE prefix || '%'
ORDER BY prefix_length DESC
LIMIT 1;
```

`$2` is the national significant number as a digit string.

### `usage_log`

```sql
id           TEXT PRIMARY KEY               -- ULID = lookup_id
api_key_id   TEXT REFERENCES api_keys(id) ON DELETE SET NULL
user_id      TEXT REFERENCES users(id) ON DELETE SET NULL
endpoint     TEXT NOT NULL
input_number TEXT
e164         TEXT
country_code CHAR(2)
line_type    TEXT
cache_hit    BOOLEAN NOT NULL
status_code  INTEGER NOT NULL
latency_ms   INTEGER NOT NULL
request_ip   INET
created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

Partitioned monthly by `created_at`. 90-day retention scheduled task.
Indexes: `(api_key_id, created_at DESC)`, `(created_at DESC)`.

### `data_loads`

```sql
id            TEXT PRIMARY KEY
source        TEXT NOT NULL
country_code  CHAR(2) NOT NULL
row_count     INTEGER
status        TEXT NOT NULL               -- 'started' | 'success' | 'failed'
error_message TEXT
started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
finished_at   TIMESTAMPTZ
```

### `jobs`

```sql
id            TEXT PRIMARY KEY            -- = BullMQ job id
user_id       TEXT NOT NULL REFERENCES users(id)
api_key_id    TEXT REFERENCES api_keys(id)
status        TEXT NOT NULL               -- 'queued'|'processing'|'complete'|'failed'
total         INTEGER NOT NULL
processed     INTEGER NOT NULL DEFAULT 0
webhook_url   TEXT
result_path   TEXT                        -- path to CSV on volume
error_message TEXT
created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
finished_at   TIMESTAMPTZ
```

---

## 6. API Endpoints

All endpoints prefixed `/api/v1`. All responses JSON.

### Lookup (requires API key — `Authorization: Bearer pi_live_...`)

| Method | Path                                   | Description                                       |
| ------ | -------------------------------------- | ------------------------------------------------- |
| GET    | `/lookup?number=<E164>&country=<ISO2>` | Single number lookup                              |
| POST   | `/lookup/bulk`                         | Synchronous bulk — max 1000, returns array        |
| POST   | `/lookup/jobs`                         | Async job — up to 1,000,000 numbers or CSV upload |
| GET    | `/lookup/jobs/:job_id`                 | Job status + progress                             |
| GET    | `/lookup/jobs/:job_id/result`          | CSV stream when complete                          |

### Account Management (requires JWT — `Authorization: Bearer <jwt>`)

| Method | Path                                      | Description                              |
| ------ | ----------------------------------------- | ---------------------------------------- |
| POST   | `/auth/register`                          | Create account → tokens                  |
| POST   | `/auth/login`                             | Login → tokens                           |
| POST   | `/auth/refresh`                           | Refresh access token                     |
| POST   | `/auth/logout`                            | Revoke refresh token                     |
| GET    | `/me`                                     | Current user                             |
| GET    | `/me/keys`                                | List API keys                            |
| POST   | `/me/keys`                                | Create API key (plaintext returned once) |
| DELETE | `/me/keys/:key_id`                        | Revoke API key                           |
| GET    | `/me/usage?from=YYYY-MM-DD&to=YYYY-MM-DD` | Daily usage counts                       |

### Admin (requires JWT + admin role)

| Method | Path                 | Description                                        |
| ------ | -------------------- | -------------------------------------------------- |
| GET    | `/admin/stats`       | System stats, cache hit ratio, p50/p95/p99 latency |
| GET    | `/admin/users`       | Paginated user list                                |
| POST   | `/admin/data/reload` | Trigger prefix data reload + flush cache           |

### Meta (public)

| Method | Path            | Description                         |
| ------ | --------------- | ----------------------------------- |
| GET    | `/health`       | `{ "status": "ok" }`                |
| GET    | `/ready`        | Verifies Postgres + Redis reachable |
| GET    | `/metrics`      | Prometheus text format              |
| GET    | `/docs`         | Swagger UI                          |
| GET    | `/openapi.json` | Raw OpenAPI 3.1 spec                |

### Lookup Response Shape

```json
{
  "input": "+12125550123",
  "valid": true,
  "e164": "+12125550123",
  "national_format": "(212) 555-0123",
  "international_format": "+1 212-555-0123",
  "country": { "code": "US", "name": "United States", "calling_code": "1" },
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

`carrier` is `null` when no prefix data exists for that country. `region` may be `null`.

### Line Type Enum

`mobile` | `fixed_line` | `fixed_line_or_mobile` | `toll_free` | `premium_rate` | `shared_cost` | `voip` | `personal_number` | `pager` | `uan` | `voicemail` | `unknown`

---

## 7. Rate Limiting

Sliding-window counters in Redis. Per API key:

| Window     | Free tier limit |
| ---------- | --------------- |
| Per minute | 60 requests     |
| Per day    | 1,000 requests  |
| Per month  | 10,000 requests |

- Bulk: counts as `numbers.length` against per-minute; hard cap 1000/request.
- Job: counts as 1 per-minute; consumes `numbers.length` per-day/per-month on completion.
- Exceeded: HTTP 429 with `Retry-After` header and `error.code = "RATE_LIMITED"`.
- Headers on every success: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
- Anonymous demo (landing page): 5 lookups/hour/IP in Redis.
- Login attempts: 10/hour/IP.

---

## 8. Caching

- Key: `lookup:v1:<E164>`
- Value: full JSON response
- TTL: 24 hours
- Invalidation: `POST /admin/data/reload` flushes all `lookup:v1:*` via `SCAN` (never `KEYS`)
- `cached: true` in response when served from Redis

---

## 9. Open-Data Ingestion Pipeline

Script: `npm run data:load` in `apps/data-loader/`.
Also scheduled inside the API container via `node-cron` to run monthly at 03:00 UTC on the 2nd.

**Data sources for v1:**

1. **NANPA** — `nationalnanpa.com` public CSV, covers `+1`. License: public domain.
2. **Ofcom** — `ofcom.org.uk` numbering plan CSV, covers `+44`. License: Open Government Licence.
3. **ACMA** (stub) — Australian Communications and Media Authority, covers `+61`. Proves the loader is generic.

**Pipeline steps:**

1. Download source files to `data/raw/` volume.
2. Validate row counts and schema sanity (reject < 1000 rows, missing required columns).
3. Load into `prefix_allocations_staging` table.
4. Atomic swap in a single transaction: rename staging → live.
5. Insert row in `data_loads` with source, count, status, timing.
6. Idempotent: re-running produces the same result.

Document URLs, licenses, and refresh cadence in `docs/data-sources.md`.

---

## 10. Portability Integration Seam

```typescript
export interface PortabilityProvider {
  lookup(e164: string): Promise<PortabilityResult | null>;
}

export class NullPortabilityProvider implements PortabilityProvider {
  async lookup(_e164: string) {
    return null;
  }
}
```

The lookup service calls `provider.lookup(e164)` and merges the result if non-null. Swapping in a real provider is a single dependency injection change. The `NullPortabilityProvider` is the default in v1.

---

## 11. Frontend Architecture

### Provider Wrapping Order

```tsx
// main.tsx
<React.StrictMode>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
</React.StrictMode>

// App.tsx
<ConfigProvider theme={theme === 'dark' ? darkTheme : lightTheme}>
  <AuthProvider>
    <SidebarProvider>
      <Routes>...</Routes>
    </SidebarProvider>
  </AuthProvider>
</ConfigProvider>
```

### React Query Config

```ts
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

### Routes

| Path         | Component           | Auth                            |
| ------------ | ------------------- | ------------------------------- |
| `/`          | `Landing.tsx`       | Public (demo: 5/hour anonymous) |
| `/login`     | `Login.tsx`         | Public                          |
| `/register`  | `Register.tsx`      | Public                          |
| `/lookup`    | `LookupPage.tsx`    | JWT required                    |
| `/dashboard` | `DashboardPage.tsx` | JWT required                    |
| `/keys`      | `KeysPage.tsx`      | JWT required                    |
| `/docs`      | `Docs.tsx`          | Public                          |
| `/admin`     | `AdminPage.tsx`     | JWT + admin role                |

### App Shell (AppLayout.tsx)

```
+-------+-------------------------------------------+
| Side  |  Header (64px, sticky)                    |
| bar   +-------------------------------------------+
| 220px |                                           |
| or    |  Content area (scrollable, max-w: 1920px) |
| 72px  |  padding: 12–24px responsive              |
+-------+-------------------------------------------+
```

- **≥ 992px:** Fixed sidebar (220px expanded / 72px collapsed via logo click)
- **< 992px:** Sidebar becomes Ant Design `Drawer` (260px wide)
- Header right: theme toggle + user avatar dropdown
- `selectedKeys={[location.pathname]}`
- `navigate(e.key)` on menu item click

### Design System

Follows the Enterprise Dashboard Design System:

**Color layers:**

```
Brand Anchors → Semantic Tokens → CSS Variables (html[data-theme])
```

**Dark theme (default):**

```css
--bg-base: #202020;
--bg-container: #2a2a2a;
--bg-elevated: #383838;
--bg-hover: #424242;
--border: #4a4a4a;
--text-primary: #f5f5f5;
--text-secondary: #cccccc;
--accent-primary: #ffd633; /* brand yellow — brighter for dark */
--status-success: #5fe670;
--status-warning: #fb923c; /* orange — never yellow for warnings */
--status-danger: #ff8a8a;
--status-info: #4df0ff;
```

**Light theme:**

```css
--bg-base: #f4f6fa;
--bg-container: #eef2f7;
--bg-elevated: #ffffff;
--border: #cbd5e1;
--text-primary: #0a0046;
--accent-primary: #ffcb05;
--status-success: #42b52e;
--status-warning: #f97316;
--status-danger: #dc2626;
--status-info: #01b4d2;
```

**Rules:**

- All colors via CSS variables — never raw hex in feature components.
- Inline `style` props on Ant Design components.
- CSS classes only for global patterns in `index.css`.
- Warning is ALWAYS orange — yellow reserved for brand only.

**Typography:**

```
Font: system font stack (-apple-system, Segoe UI, Roboto, …)
Base: 14px / 1.5714
KPI labels: 11px uppercase, letter-spacing 0.8px, --text-secondary
KPI values: 28px, bold, tabular-nums
Page titles: 28px → 18px mobile
Card headers: 16px, weight 600
```

**Border radius:** 12px cards, 8px inputs/buttons, 4–6px tags.

**Transitions:** `all 0.2s ease` on all interactive elements.

### Key Page Designs

#### Landing (`/`)

- Marketing copy visible without login.
- "Try it" lookup form: anonymous, limited to 5/hour via Redis IP counter.
- Result displayed inline as a card.
- CTA to register for full access.

#### Lookup (`/lookup`) — logged in

- Single number input form.
- Result card showing all fields from the API response.
- Tabs below result: **Single** | **Bulk**
  - Bulk tab: CSV upload + manual textarea. Shows job status polling.

#### Dashboard (`/dashboard`)

- KPI grid: total lookups (30d), cache hit %, unique numbers, API calls today.
- `UsageChart`: ECharts line chart, daily counts past 30 days.
- `ApiKeyList`: table of keys with name, prefix, last used, tier, created date.

#### Keys (`/keys`)

- Table: key name, prefix (`pi_live_XXXXXXXX`), tier, last used, created.
- Create button → modal form → on success show plaintext key once in modal with copy button.
- Revoke: Popconfirm inline.

#### Admin (`/admin`)

- `StatsGrid`: KPI cards for total users, total lookups, cache hit ratio, queue depth.
- Latency chart: p50/p95/p99 histogram for last 24h.
- `UsersTable`: paginated, sortable. Edit role + status. Delete with Popconfirm.
- "Reload Data" button → POST `/admin/data/reload` with confirmation.

#### Login (`/login`)

```
Centered card (max-width: 420px)
[Looki logo]
[Email input]
[Password input]
[Sign In button] — brand yellow bg, black text
Footer: "© 2026 Looki  / Mohamed Ali"
```

### ECharts Color Palette

```ts
// Dark
["#FFD633", "#FB923C", "#34D399", "#A78BFA", "#F87171", "#22D3EE", "#F472B6"][
  // Light
  ("#FFCB05", "#F97316", "#10B981", "#8B5CF6", "#EF4444", "#06B6D4", "#EC4899")
];
```

---

## 12. Docker Compose

### `docker-compose.yml` (full production)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck: { test: pg_isready, interval: 5s, retries: 10 }

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes: [redisdata:/data]
    healthcheck: { test: redis-cli ping, interval: 5s }

  api:
    build: apps/api
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
    command: node dist/index.js
    ports: ["3000:3000"]

  web:
    build: apps/web
    ports: ["80:80"]
    # nginx proxies /api → api:3000

  worker:
    build: apps/api
    command: node dist/jobs/worker.js
    depends_on: [api]

  data-loader:
    build: apps/data-loader
    command: node dist/index.js
    depends_on:
      postgres: { condition: service_healthy }
    profiles: ["loader"] # only runs when explicitly invoked

volumes: { pgdata: {}, redisdata: {} }
```

### `docker-compose.minimal.yml` (app + postgres — quick start)

For development and simple self-hosting without Redis. Rate limiting falls back to in-memory (single-process only, no distributed limiting).

### `docker-compose.dev.yml` overlay

Bind-mounts source code, `tsx watch` for API hot reload, Vite dev server for web.

### `.env.example` (all variables)

```env
# Database
DATABASE_URL=postgres://looki:looki@postgres:5432/looki
POSTGRES_USER=looki
POSTGRES_PASSWORD=looki
POSTGRES_DB=looki

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# API
PORT=3000
NODE_ENV=production
CORS_ALLOWED_ORIGINS=http://localhost

# Seed admin
ADMIN_EMAIL=admin@looki.local
ADMIN_PASSWORD=change-me

# Rate limits (free tier defaults)
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_DAY=1000
RATE_LIMIT_PER_MONTH=10000

# Demo lookup limit
DEMO_RATE_LIMIT_PER_HOUR=5

# Data loader
DATA_RAW_PATH=/data/raw
```

---

## 13. Security Checklist

- [x] Passwords: argon2id, default OWASP params.
- [x] API keys: 32 bytes CSPRNG → base32 → `pi_live_` prefix. Only SHA-256 hash in DB.
- [x] JWTs: short-lived access (15m) + long-lived refresh (7d) with DB revocation.
- [x] Plaintext key returned exactly once; never logged.
- [x] Helmet middleware on all routes.
- [x] CORS: allowlist from `CORS_ALLOWED_ORIGINS` env var. Default deny.
- [x] Zod validation on every endpoint (body, query, params). Unknown fields rejected.
- [x] Parameterized SQL only. No string concatenation.
- [x] Generic error messages on auth failures (no enumeration).
- [x] Rate limit login: 10/hour/IP.
- [x] No secrets in code or Git history.
- [x] Non-root user in Docker containers.
- [x] `httpOnly` cookies are not used (JWT in localStorage per correction).
- [x] HTTPS enforced in production via reverse proxy / deployment config.

---

## 14. Performance Targets

| Metric                                   | Target                                   |
| ---------------------------------------- | ---------------------------------------- |
| p50 latency (cache hit)                  | < 10 ms server-side                      |
| p50 latency (cache miss)                 | < 50 ms server-side                      |
| p99 latency                              | < 200 ms                                 |
| Throughput (single instance, warm cache) | ≥ 500 req/s on 2 vCPU                    |
| Bulk 100 numbers (warm cache)            | < 2 seconds                              |
| Job 50,000 numbers                       | Completes successfully, CSV downloadable |

Index tuning: if `LIKE prefix || '%'` on the full NANPA dataset (~400k rows) misses targets, convert to `int8range` prefix ranges — document the decision in `docs/architecture.md`.

---

## 15. Observability

- **Logs:** Pino, JSON in prod. Every line includes `request_id` (ULID, also in `X-Request-Id` header).
- **Metrics** (`/metrics` Prometheus format):
  - HTTP request count and latency histogram (by route, status)
  - Cache hit / miss counter
  - BullMQ queue depth
  - DB pool: total, idle, waiting connections
- **Optional overlay:** `docker-compose.observability.yml` adds Prometheus + Grafana with pre-built dashboard JSON.

---

## 16. Testing Strategy

| Layer       | Tools                          | Coverage target                                 |
| ----------- | ------------------------------ | ----------------------------------------------- |
| Unit        | Vitest                         | ≥ 80% lines for `lookup/` and `auth/`           |
| Integration | Vitest + Supertest             | Every endpoint, happy path + ≥1 error path      |
| E2E smoke   | docker compose up + curl/fetch | Boots full stack, runs 5 lookups, checks health |

**Unit test scope:** parser, carrier repo (real test Postgres), Redis cache, rate limiter, password hashing, API key generation/verification, JWT sign/verify.

**Integration test scope:** all auth flows, lookup (valid/invalid/cached), bulk, job create + poll, admin endpoints, rate limit 429 response.

---

## 17. Implementation Sequence

Build in this order. Each step is runnable and tested before the next.

1. **Repo scaffold** — workspaces, TypeScript configs, Docker Compose skeleton (postgres + redis), `/health` endpoint. ✓ Verify: `curl localhost:3000/api/v1/health`.
2. **Database migrations** — `countries`, `prefix_allocations` tables. Seed countries from static JSON.
3. **Lookup core** — parser (libphonenumber-js) + carrier repo (LPM SQL) + lookup service. No HTTP. Unit tests.
4. **`GET /lookup` endpoint** — no auth yet. Test with env-var bypass.
5. **Redis cache layer** — `cache.ts`, `cached` field in response.
6. **JWT auth** — `users`, `refresh_tokens`, `api_keys` tables. `/auth/*`, `/me/keys`. JWT middleware. Rate limiter.
7. **Usage log** — async write per lookup. `/me/usage`. Admin endpoints.
8. **Data loader** — NANPA + Ofcom + ACMA stub. Replace seed data with real prefix load.
9. **Bulk endpoint** — synchronous, cap 1000 per request.
10. **Job queue** — BullMQ worker, async jobs, webhook on completion, CSV download.
11. **Web UI scaffold** — AppLayout, landing page, login/register, theme system.
12. **Web UI features** — lookup page, dashboard, keys page, admin page.
13. **OpenAPI spec** — Swagger UI at `/docs`, raw spec at `/openapi.json`.
14. **Metrics** — Prometheus endpoint. Optional Grafana overlay.
15. **Tests to coverage target** — unit + integration + e2e smoke.
16. **Documentation pass** — README with screenshots, architecture diagram, curl examples.
17. **Performance pass** — benchmark LPM query, tune indexes if needed. Document in `docs/architecture.md`.

---

## 18. Acceptance Criteria

The implementation is complete when **all** hold:

1. `cp .env.example .env && docker compose up` — full stack up, healthchecks pass within 2 minutes.
2. NANPA and Ofcom datasets loaded in `prefix_allocations`.
3. `curl .../api/v1/lookup?number=%2B12125550123 -H "Authorization: Bearer pi_live_..."` returns `carrier.name` non-null and `country.code = "US"`.
4. `http://localhost/` — landing page visible, anonymous demo lookup works up to 5 times/hour.
5. Register → generate API key → use from curl → all succeed.
6. Bulk 100 numbers returns in < 2 seconds (warm cache).
7. Job 50,000 numbers completes, CSV downloadable.
8. `/docs` renders Swagger UI with all endpoints and schemas.
9. `/metrics` returns Prometheus format.
10. `npm test` from root — all workspace tests green.
11. Restart any single container — recovers without manual intervention.
12. README screenshots/GIF present and accurate.
13. Portability disclaimer present verbatim in README.

---

## 19. Things Not To Do

- Do **not** call external paid APIs (Twilio, NumVerify, HLR services).
- Do **not** introduce any AI/ML dependency (no Ollama, no OpenAI).
- Do **not** use an ORM (Prisma, TypeORM, Sequelize) — use `pg` driver + repository pattern.
- Do **not** swap PostgreSQL for MongoDB.
- Do **not** log or store plaintext API keys or passwords.
- Do **not** silently degrade when carrier data is missing — return `carrier: null`.
- Do **not** scope creep into portability, SMS, voice, or HLR.
- Do **not** use `KEYS` command in Redis — always `SCAN`.
- Do **not** put secrets in code or Git history.

---

_End of plan._
