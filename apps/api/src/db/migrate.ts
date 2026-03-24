import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://medconnect:secret@localhost:5432/medconnect',
});

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('Running migrations...');

    const sql = readFileSync(
      join(__dirname, 'migrations/001_initial_schema.sql'),
      'utf-8',
    );

    await client.query(sql);

    console.log('✅ Migration 001_initial_schema applied successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
