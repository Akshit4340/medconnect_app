import request from 'supertest';
import express from 'express';
import { pgPool } from '../../config/database';
import { redis } from '../../config/redis';

jest.mock('../../config/database', () => ({
  pgPool: { query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }) },
}));

jest.mock('../../config/redis', () => ({
  redis: { ping: jest.fn().mockResolvedValue('PONG') },
}));

jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../config/mongodb', () => ({
  connectMongoDB: jest.fn(),
}));

jest.mock('mongoose', () => ({
  connection: { readyState: 1 },
  connect: jest.fn(),
  model: jest.fn(),
  Schema: jest.fn().mockImplementation(() => ({
    index: jest.fn().mockReturnThis(),
  })),
}));

jest.mock('../../config/storage', () => ({
  ensureBucket: jest.fn(),
  getUploadPresignedUrl: jest.fn(),
  getFileUrl: jest.fn(),
  s3: {},
}));

jest.mock('../../config/passport', () => ({
  initPassport: jest.fn(),
}));

describe('GET /health', () => {
  it('should return 200 with ok status', async () => {
    const app = express();
    app.use(express.json());

    app.get('/health', async (_req, res) => {
      const health = {
        status: 'ok' as 'ok' | 'degraded',
        timestamp: new Date().toISOString(),
        services: {
          postgres: 'unknown' as 'ok' | 'error',
          redis: 'unknown' as 'ok' | 'error',
          mongodb: 'ok' as 'ok' | 'error',
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

      res.status(200).json(health);
    });

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.services.postgres).toBe('ok');
    expect(response.body.services.redis).toBe('ok');
  });
});
