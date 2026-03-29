import 'dotenv/config';
import express, { Application } from 'express';
import { pgPool } from './config/database';
import { redis } from './config/redis';
import { logger } from './config/logger';
import { tenantMiddleware } from './middleware/tenant';
import authRoutes from './routes/auth.routes';
import doctorRoutes from './routes/doctor.routes';
import appointmentRoutes from './routes/appointment.routes';
import patientRoutes from './routes/patient.routes';
import passport from 'passport';
import { initPassport } from './config/passport';
import { ensureBucket } from './config/storage';
import { connectMongoDB } from './config/mongodb';
import medicalRoutes from './routes/medical.routes';
import mongoose from 'mongoose';
import { authRateLimit, apiRateLimit } from './middleware/rate-limit';
import { registry } from './config/metrics';
import { metricsMiddleware } from './middleware/metrics';
import cors from 'cors';

const app: Application = express();
const PORT = process.env.PORT || 3001;

// ─── Global middleware ────────────────────────────────────────────────────────

initPassport();
app.use(passport.initialize());

app.use(metricsMiddleware);

app.use('/auth/login', authRateLimit);
app.use('/auth/register', authRateLimit);
app.use('/api', apiRateLimit);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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
  if (req.path === '/health') return next();
  tenantMiddleware(req, res, next);
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/auth', authRoutes);
app.use('/doctors', doctorRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/patients', patientRoutes);
app.use('/medical', medicalRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────

const health = {
  status: 'ok' as 'ok' | 'degraded',
  timestamp: new Date().toISOString(),
  services: {
    postgres: 'unknown' as 'ok' | 'error',
    redis: 'unknown' as 'ok' | 'error',
    mongodb: 'unknown' as 'ok' | 'error',
  },
};

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
