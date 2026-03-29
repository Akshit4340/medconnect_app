import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';

export const registry = new Registry();

// Collect Node.js default metrics (memory, CPU, event loop)
collectDefaultMetrics({ register: registry });

// ─── HTTP metrics ─────────────────────────────────────────────────────────────

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

export const httpRequestDurationMs = new Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  registers: [registry],
});

// ─── Business metrics ─────────────────────────────────────────────────────────

export const appointmentsCreatedTotal = new Counter({
  name: 'appointments_created_total',
  help: 'Total appointments created',
  labelNames: ['tenant_id'],
  registers: [registry],
});

export const appointmentsCancelledTotal = new Counter({
  name: 'appointments_cancelled_total',
  help: 'Total appointments cancelled',
  labelNames: ['tenant_id'],
  registers: [registry],
});

export const authLoginTotal = new Counter({
  name: 'auth_login_total',
  help: 'Total login attempts',
  labelNames: ['status'],
  registers: [registry],
});

export const activeDbConnections = new Gauge({
  name: 'db_connections_active',
  help: 'Active PostgreSQL pool connections',
  registers: [registry],
});
