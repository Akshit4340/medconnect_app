import express from 'express';
import { pgPool } from './config/database';
import { logger } from './config/logger';
import { tenantMiddleware } from './middleware/tenant';
import type { Application } from 'express';
import 'dotenv/config';

const app: Application = express();
const PORT = process.env.PORT || 3001;

// ─── Global middleware ───────────────────────────────────────────────────────

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log every incoming request
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    host: req.headers.host,
    ip: req.ip,
  });
  next();
});

// Tenant resolution (runs on every request except /health)
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  tenantMiddleware(req, res, next);
});

// ─── Health check ────────────────────────────────────────────────────────────

app.get('/health', async (_req, res) => {
  const health = {
    status: 'ok' as 'ok' | 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      postgres: 'unknown' as 'ok' | 'error',
    },
  };

  // Check Postgres
  try {
    await pgPool.query('SELECT 1');
    health.services.postgres = 'ok';
  } catch (err) {
    health.services.postgres = 'error';
    health.status = 'degraded';
    logger.error('Postgres health check failed', { error: err });
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// ─── Test tenant route ───────────────────────────────────────────────────────

app.get('/api/me/tenant', (req, res) => {
  if (!req.tenant) {
    res.status(400).json({ success: false, error: 'No tenant context' });
    return;
  }
  res.json({ success: true, data: req.tenant });
});

// ─── Global error handler ────────────────────────────────────────────────────

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Internal server error' });
  },
);

// ─── Start server ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  logger.info(`MedConnect API running`, {
    port: PORT,
    env: process.env.NODE_ENV,
  });
});

export default app;
