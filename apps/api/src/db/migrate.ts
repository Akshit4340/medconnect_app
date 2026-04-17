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
  '005_doctors_patients.sql',
  '006_prescriptions.sql',
  '007_seed_demo_tenant.sql',
];

async function migrate() {
  const client = await pool.connect();

  try {
    // Bootstrap: ensure migrations tracking table exists BEFORE
    // checking which migrations have been applied.
    // (001_initial_schema.sql also creates this table, but we need it first)
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    logger.info('Running migrations...');

    for (const file of migrations) {
      // Check if migration has already been applied
      const result = await client.query(
        'SELECT name FROM migrations WHERE name = $1',
        [file],
      );

      if (result.rows.length > 0) {
        logger.info(`⏭️  Skipped (already applied): ${file}`);
        continue;
      }

      const sql = readFileSync(join(__dirname, 'migrations', file), 'utf-8');
      await client.query(sql);

      // Record the migration as applied
      await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);

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
