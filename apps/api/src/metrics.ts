import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

export const metricsRegistry = new Registry();

collectDefaultMetrics({ register: metricsRegistry, prefix: 'looki_' });

// HTTP request total counter (by method, route, status_code)
export const httpRequestsTotal = new Counter({
  name: 'looki_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [metricsRegistry],
});

// HTTP request duration histogram (by method, route, status_code)
export const httpRequestDurationMs = new Histogram({
  name: 'looki_http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [5, 10, 25, 50, 100, 200, 500, 1000, 2500, 5000],
  registers: [metricsRegistry],
});

// Cache hit/miss counters
export const cacheHitsTotal = new Counter({
  name: 'looki_cache_hits_total',
  help: 'Total number of lookup cache hits',
  registers: [metricsRegistry],
});

export const cacheMissesTotal = new Counter({
  name: 'looki_cache_misses_total',
  help: 'Total number of lookup cache misses',
  registers: [metricsRegistry],
});

// BullMQ queue depth gauge
export const queueDepth = new Gauge({
  name: 'looki_queue_depth',
  help: 'Current BullMQ bulk lookup queue depth (waiting jobs)',
  registers: [metricsRegistry],
});

// DB pool metrics
export const dbPoolTotal = new Gauge({
  name: 'looki_db_pool_total',
  help: 'Total connections in the PostgreSQL pool',
  registers: [metricsRegistry],
});

export const dbPoolIdle = new Gauge({
  name: 'looki_db_pool_idle',
  help: 'Idle connections in the PostgreSQL pool',
  registers: [metricsRegistry],
});

export const dbPoolWaiting = new Gauge({
  name: 'looki_db_pool_waiting',
  help: 'Requests waiting for a PostgreSQL pool connection',
  registers: [metricsRegistry],
});
