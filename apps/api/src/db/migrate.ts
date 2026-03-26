import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import { logger } from '../config/logger';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const migrations = [
  '001_initial_schema.sql',
  '002_auth_fields.sql',
  '003_row_level_security.sql',
  '004_oauth.sql',
];

async function migrate() {
  const client = await pool.connect();

  try {
    logger.info('Running migrations...');

    for (const file of migrations) {
      const sql = readFileSync(join(__dirname, 'migrations', file), 'utf-8');
      await client.query(sql);
      logger.info(`✅ Applied: ${file}`);
    }

    logger.info('All migrations complete');
  } catch (err) {
    logger.error('Migration failed', { error: err });
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
