/*
 * Migration verification gate for CI/CD
 */

const postgres = require('../models/postgres');

async function run() {
  if (!postgres.isEnabled()) {
    console.log('[verify-migrations] PostgreSQL disabled; skipping');
    process.exit(0);
  }

  const requiredTables = [
    'users',
    'user_sessions',
    'oauth_identities',
    'feature_flags',
    'analytics_events',
    'leaderboard_entries',
    'game_states',
    'feature_flag_audit_logs'
  ];

  for (const table of requiredTables) {
    const result = await postgres.query(
      `SELECT to_regclass($1) AS reg`,
      [table]
    );

    if (!result.rows[0]?.reg) {
      throw new Error(`Missing required table: ${table}`);
    }
  }

  console.log('[verify-migrations] schema check passed');
}

run().catch((err) => {
  console.error('[verify-migrations] failed:', err.message);
  process.exit(1);
});
