import 'dotenv/config';
import express, { Application } from 'express';
import { env } from './config/env';
import { pgPool } from './config/database';
import { redis } from './config/redis';
import { logger } from './config/logger';
import { tenantMiddleware } from './shared/middleware/tenant';
import authRoutes from './modules/auth/auth.routes';
import doctorRoutes from './modules/users/doctor.routes';
import appointmentRoutes from './modules/appointments/appointment.routes';
import patientRoutes from './modules/users/patient.routes';
import passport from 'passport';
import { initPassport } from './config/passport';
import { ensureBucket } from './config/storage';
import { connectMongoDB } from './config/mongodb';
import medicalRoutes from './modules/consultations/medical.routes';
import fileRoutes from './modules/media/file.routes';
import mongoose from 'mongoose';
import { authRateLimit, apiRateLimit } from './shared/middleware/rate-limit';
import { registry } from './config/metrics';
import { metricsMiddleware } from './shared/middleware/metrics';
import cors from 'cors';
import { createBullBoardRouter } from './config/bull-board';

const app: Application = express();
const PORT = env.PORT;

// ─── Global middleware ────────────────────────────────────────────────────────

initPassport();
app.use(passport.initialize());

app.use(metricsMiddleware);

app.use('/auth/login', authRateLimit);
app.use('/auth/register', authRateLimit);
app.use('/api', apiRateLimit);

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

ensureBucket().catch((err) =>
  logger.warn('MinIO bucket setup failed — file uploads unavailable', { err }),
);

connectMongoDB();

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
  if (req.path === '/health' || req.path === '/metrics') return next();
  tenantMiddleware(req, res, next);
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/auth', authRoutes);
app.use('/doctors', doctorRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/patients', patientRoutes);
app.use('/medical', medicalRoutes);
app.use('/files', fileRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', async (_req, res) => {
  const health = {
    status: 'ok' as 'ok' | 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      postgres: 'unknown' as 'ok' | 'error',
      redis: 'unknown' as 'ok' | 'error',
      mongodb: 'unknown' as 'ok' | 'error',
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
  try {
    if (mongoose.connection.readyState === 1) {
      health.services.mongodb = 'ok';
    } else {
      health.services.mongodb = 'error';
      health.status = 'degraded';
    }
  } catch {
    health.services.mongodb = 'error';
    health.status = 'degraded';
  }

  res.status(health.status === 'ok' ? 200 : 503).json(health);
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', registry.contentType);
  res.send(await registry.metrics());
});

app.use('/admin/queues', createBullBoardRouter());

// ─── Global error handler ─────────────────────────────────────────────────────

app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });

    if (err.isOperational) {
      return res.status(err.statusCode || 400).json({
        success: false,
        error: err.message,
        code: err.code || 'BAD_REQUEST',
      });
    }

    res.status(500).json({ success: false, error: 'Internal server error' });
  },
);

// ─── Start ────────────────────────────────────────────────────────────────────

const server = app.listen(PORT, () => {
  logger.info('MedConnect API running', {
    port: PORT,
    env: env.NODE_ENV,
  });
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────

async function shutdown() {
  logger.info('Shutting down gracefully...');
  server.close(() => {
    logger.info('HTTP server closed');
  });
  await pgPool.end();
  await redis.quit();
  await mongoose.disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
