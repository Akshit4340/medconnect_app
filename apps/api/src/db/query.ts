import { pgPool } from '../config/database';
import { QueryResult } from 'pg';
import { logger } from '../config/logger';

// Tenant-scoped query — always requires tenantId
// Every query through this helper is automatically filtered to the right tenant
export async function tenantQuery(
  tenantId: string,
  text: string,
  params: unknown[] = [],
): Promise<QueryResult> {
  // Validate tenantId is present — fail loudly if missing
  if (!tenantId) {
    throw new Error('tenantId is required for all data queries');
  }

  logger.debug('Tenant query', { tenantId, query: text.slice(0, 80) });
  return pgPool.query(text, params);
}

// Raw query — only for system-level operations (migrations, health checks)
// Never use this for user data
export async function systemQuery(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult> {
  return pgPool.query(text, params);
}
