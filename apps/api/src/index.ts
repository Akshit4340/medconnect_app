import 'dotenv/config';
import express, { Application } from 'express';
import { pgPool } from './config/database';
import { redis } from './config/redis';
import { logger } from './config/logger';
import { tenantMiddleware } from './middleware/tenant';
import authRoutes from './routes/auth.routes';

const app: Application = express();
const PORT = process.env.PORT || 3001;

// ─── Global middleware ────────────────────────────────────────────────────────

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    host: req.headers.host,
    ip: req.ip,
  });
  next();
});

app.use((req, res, next) => {
  if (req.path === '/health') return next();
  tenantMiddleware(req, res, next);
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/auth', authRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', async (_req, res) => {
  const health = {
    status: 'ok' as 'ok' | 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      postgres: 'unknown' as 'ok' | 'error',
      redis: 'unknown' as 'ok' | 'error',
    },
  };

  try {
    await pgPool.query('SELECT 1');
    health.services.postgres = 'ok';
  } catch {
    health.services.postgres = 'error';
    health.status = 'degraded';
  }

  try {
    await redis.ping();
    health.services.redis = 'ok';
  } catch {
    health.services.redis = 'error';
    health.status = 'degraded';
  }

  res.status(health.status === 'ok' ? 200 : 503).json(health);
});

// ─── Global error handler ─────────────────────────────────────────────────────

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

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  logger.info('MedConnect API running', {
    port: PORT,
    env: process.env.NODE_ENV,
  });
});
