import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';

export function rateLimit(options: {
  windowMs: number;
  max: number;
  keyPrefix: string;
}) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const ip = req.ip || 'unknown';
    const key = `ratelimit:${options.keyPrefix}:${ip}`;
    const windowSec = Math.floor(options.windowMs / 1000);

    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, windowSec);
    }

    res.setHeader('X-RateLimit-Limit', options.max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - current));

    if (current > options.max) {
      res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
      return;
    }

    next();
  };
}

// Pre-configured rate limiters
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  keyPrefix: 'auth',
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  keyPrefix: 'api',
});
