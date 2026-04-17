import { Request, Response, NextFunction } from 'express';
import { httpRequestsTotal, httpRequestDurationMs } from '../../config/metrics';

export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now();

  // Normalize route to avoid high cardinality
  // e.g. /doctors/abc-123/slots → /doctors/:id/slots
  const route = req.route?.path || req.path.replace(/[0-9a-f-]{36}/g, ':id');

  res.on('finish', () => {
    const duration = Date.now() - start;
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };

    httpRequestsTotal.inc(labels);
    httpRequestDurationMs.observe(labels, duration);
  });

  next();
}
