# Deployment Guide

This guide covers production deployment of Looki using Docker Compose, reverse proxy configuration, TLS termination, environment variable hardening, and backup procedures.

---

## Prerequisites

- Docker Engine 24+ with the Compose plugin
- A server with at least 1 vCPU, 1 GB RAM, and 10 GB disk (2 vCPU / 4 GB recommended for production)
- A domain name pointing to your server's IP address
- Ports 80 and 443 open in your firewall

---

## Quick Production Deploy

```bash
# Clone the repository
git clone https://github.com/Muhammad-FRAX/looki.git
cd looki

# Copy and edit environment configuration
cp .env.example .env
nano .env   # see Environment Variables section below

# Build and start all services
docker compose up -d --build

# Load prefix data (required for carrier lookups to return results)
docker compose run --profile loader data-loader

# Verify the stack is healthy
curl http://localhost:3000/api/v1/ready
```

---

## Environment Variables

Minimum required changes from `.env.example` for production:

| Variable | Action |
|---|---|
| `JWT_ACCESS_SECRET` | Set to 32+ random characters: `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Set to a **different** 32+ random value |
| `ADMIN_EMAIL` | Email address for the seeded admin account |
| `ADMIN_PASSWORD` | Strong password for the admin account |
| `CORS_ALLOWED_ORIGINS` | Your public domain(s): `https://looki.example.com` |
| `NANPA_DATA_URL` | URL or `file://` path to the NANPA NXX CSV |
| `OFCOM_DATA_URL` | URL or `file://` path to the Ofcom CSV |

Secrets must never be committed to version control. Verify your `.env` is listed in `.gitignore`.

---

## Reverse Proxy & TLS

### nginx (standalone)

Install nginx and certbot on the host. Example configuration:

```nginx
# /etc/nginx/sites-available/looki
server {
    listen 80;
    server_name looki.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name looki.example.com;

    ssl_certificate     /etc/letsencrypt/live/looki.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/looki.example.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;

    # API — proxy to Node.js
    location /api/ {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        client_max_body_size 55m;   # allow CSV uploads up to 50 MB
    }

    # Web UI — proxy to nginx inside Docker
    location / {
        proxy_pass         http://127.0.0.1:80;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
    }
}
```

```bash
# Obtain a certificate with certbot
certbot --nginx -d looki.example.com

# Reload nginx
nginx -t && systemctl reload nginx
```

### Caddy (alternative)

Caddy handles TLS automatically via Let's Encrypt:

```
# /etc/caddy/Caddyfile
looki.example.com {
    handle /api/* {
        reverse_proxy localhost:3000
    }
    handle {
        reverse_proxy localhost:80
    }
}
```

```bash
systemctl start caddy
```

---

## Docker Compose Port Mapping

By default, `docker-compose.yml` maps:
- `api` → host port `3000`
- `web` → host port `80`

If you are running nginx or Caddy on the host, you can restrict Docker ports to localhost to prevent direct access:

```yaml
# In docker-compose.yml (or an override file)
services:
  api:
    ports:
      - "127.0.0.1:3000:3000"
  web:
    ports:
      - "127.0.0.1:8080:80"   # use 8080 to avoid conflict with host nginx
```

Update your reverse proxy to target `127.0.0.1:8080` for the web service in this case.

---

## Persistence & Backups

### Docker Volumes

| Volume | Contains |
|---|---|
| `pgdata` | All PostgreSQL data (users, keys, prefix allocations, usage logs) |
| `redisdata` | Redis AOF — rate limit counters, BullMQ queues |
| `jobsdata` | CSV result files for async bulk jobs |

### PostgreSQL Backup

```bash
# Manual dump (all databases)
docker compose exec postgres pg_dump -U looki looki > looki-$(date +%F).sql

# Restore
docker compose exec -T postgres psql -U looki looki < looki-2026-05-15.sql
```

For automated backups, mount a backup script via a cron job on the host or use a tool such as `pgbackup` or Barman.

### Redis

Redis uses AOF persistence (`--appendonly yes`). If you need to back up the Redis state (rate limit counters are ephemeral and do not need backing up — BullMQ job state is more important):

```bash
docker compose exec redis redis-cli BGSAVE
# Copy /data/dump.rdb from the redisdata volume
```

In practice, BullMQ jobs can be re-submitted if lost. Consider Redis persistence optional and focus backup effort on PostgreSQL.

---

## Scaling

### Horizontal API scaling

The API is stateless (all state in Postgres + Redis). Run multiple `api` containers behind a load balancer:

```yaml
# docker-compose.yml override
services:
  api:
    deploy:
      replicas: 3
```

The `worker` service (BullMQ consumer) can similarly be scaled horizontally — BullMQ handles concurrent consumers safely.

### Database connection pooling

Each API container creates a `pg.Pool` with default settings (max 10 connections). For high-concurrency deployments, consider PgBouncer between the API and Postgres:

```yaml
services:
  pgbouncer:
    image: pgbouncer/pgbouncer:latest
    environment:
      DATABASES_HOST: postgres
      DATABASES_PORT: "5432"
      DATABASES_USER: looki
      DATABASES_PASSWORD: looki
      DATABASES_DB: looki
      POOL_MODE: transaction
      MAX_CLIENT_CONN: "500"
      DEFAULT_POOL_SIZE: "20"
```

Update `DATABASE_URL` in `.env` to point to PgBouncer.

---

## Updating

```bash
# Pull latest code
git pull

# Rebuild and restart (zero-downtime with multiple replicas)
docker compose build
docker compose up -d

# Migrations run automatically on API startup
```

---

## Observability Stack

The optional observability overlay adds Prometheus and Grafana:

```bash
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
```

- **Prometheus** scrapes `/api/v1/metrics` every 15 seconds.
- **Grafana** is available at `http://localhost:3001` (default credentials: `admin` / `admin`).

The pre-built dashboard shows:
- HTTP request rate and latency (p50/p95/p99) by route
- Cache hit/miss ratio
- BullMQ queue depth
- PostgreSQL pool utilisation

Import `observability/grafana-dashboard.json` if it is not auto-provisioned.

---

## Security Checklist

- [ ] `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` set to unique 32+ char random values
- [ ] `ADMIN_PASSWORD` changed from the default
- [ ] `CORS_ALLOWED_ORIGINS` restricted to your production domain(s)
- [ ] `SKIP_AUTH=false` (never enable in production)
- [ ] API port (`3000`) bound to localhost only (not `0.0.0.0`) if a reverse proxy is in use
- [ ] TLS certificate installed and HTTP → HTTPS redirect in place
- [ ] PostgreSQL `POSTGRES_PASSWORD` changed from the default
- [ ] Docker containers running as non-root (enforced by the Dockerfiles)
- [ ] Regular PostgreSQL backups scheduled
- [ ] Firewall: only ports 80 and 443 open externally
