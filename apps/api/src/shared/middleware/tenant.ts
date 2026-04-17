import { Request, Response, NextFunction } from 'express';
import { pgPool } from '../../config/database';
import { TenantContext } from '@medconnect/types';

// Extend Express Request to carry tenant context
declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Extract subdomain from Host header
    // e.g. "citycare.localhost:3001" → subdomain = "citycare"
    const host = req.headers.host ?? '';
    const hostWithoutPort = host.split(':')[0] ?? '';
    const subdomain = hostWithoutPort.split('.')[0] ?? '';

    // Skip tenant resolution for direct localhost access
    if (!subdomain || subdomain === 'localhost' || subdomain === '127') {
      next();
      return;
    }

    // Look up tenant in database by subdomain
    const result = await pgPool.query(
      'SELECT id, subdomain FROM tenants WHERE subdomain = $1 AND is_active = true',
      [subdomain],
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: `Tenant '${subdomain}' not found`,
      });
      return;
    }

    // Attach tenant context to request — available in all subsequent handlers
    req.tenant = {
      tenantId: result.rows[0].id,
      subdomain: result.rows[0].subdomain,
    };

    next();
  } catch (err) {
    next(err);
  }
}
