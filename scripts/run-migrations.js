/*
 * PostgreSQL migration runner
 * Usage: npm run db:migrate
 */

const fs = require('fs');
const path = require('path');
const postgres = require('../models/postgres');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');

async function run() {
  if (!postgres.isEnabled()) {
    console.log('[migrations] Skipped: DATABASE_URL/DB_PROVIDER not configured');
    process.exit(0);
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('[migrations] No SQL files found');
    process.exit(0);
  }

  await postgres.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const file of files) {
    const existing = await postgres.query('SELECT filename FROM schema_migrations WHERE filename = $1', [file]);
    if (existing.rows.length > 0) {
      console.log(`[migrations] Already applied: ${file}`);
      continue;
    }

    const sqlPath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log(`[migrations] Applying: ${file}`);
    await postgres.query('BEGIN');
    try {
      await postgres.query(sql);
      await postgres.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await postgres.query('COMMIT');
    } catch (err) {
      await postgres.query('ROLLBACK');
      throw err;
    }
  }

  console.log('[migrations] Complete');
}

run().catch((err) => {
  console.error('[migrations] Failed:', err.message);
  process.exit(1);
});
