# Looki — Phone Number Intelligence Service

Looki is a self-hostable web service that accepts a phone number and returns structured intelligence: country, region, line type, formatted representations, and the original carrier allocation.

> **Portability disclaimer:** This service returns the original carrier the number block was allocated to. Real-time portability requires integration with a paid upstream provider, which the architecture supports via a pluggable lookup module.

## Quick start

```bash
cp .env.example .env
docker compose up
curl http://localhost:3000/api/v1/health
```

## Workspace structure

```
apps/
  api/          Express REST API (Node.js 20, TypeScript)
  web/          React 18 frontend (Vite 5, Ant Design 5)
  data-loader/  Open-data ingestion CLI
packages/
  shared/       Shared TypeScript types
```

## Development

```bash
# Full stack (hot reload)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Minimal (API + Postgres, no Redis)
docker compose -f docker-compose.minimal.yml up
```

## API

All endpoints are prefixed `/api/v1`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | `{ "status": "ok" }` |
| GET | `/ready` | None | Verifies Postgres + Redis reachable |
| GET | `/lookup?number=<E164>` | API key | Single number lookup |

See `/docs` for the full Swagger UI once the service is running.

## License

MIT
