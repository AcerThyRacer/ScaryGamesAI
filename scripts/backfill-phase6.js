/*
 * Phase 6 backfill runner
 * Backfills JSON user/analytics data into PostgreSQL when DB_PROVIDER=postgres
 */

const db = require('../models/database');
const postgres = require('../models/postgres');

async function upsertUser(user) {
  await postgres.query(
    `INSERT INTO users (id, username, email, auth_token, avatar, title, inventory, horror_coins, account_credit, is_eternal, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11::timestamptz,$12::timestamptz)
     ON CONFLICT (id) DO UPDATE
       SET username = EXCLUDED.username,
           email = EXCLUDED.email,
           updated_at = NOW()`,
    [
      user.id,
      user.username || 'Player',
      user.email || null,
      user.authToken || null,
      user.avatar || null,
      user.title || null,
      JSON.stringify(user.inventory || []),
      Number(user.horrorCoins || 0),
      Number(user.accountCredit || 0),
      !!user.isEternal,
      user.createdAt || new Date().toISOString(),
      user.updatedAt || new Date().toISOString()
    ]
  );
}

async function insertAnalytics(events) {
  for (const event of events) {
    await postgres.query(
      `INSERT INTO analytics_events (id, user_id, event_name, event_category, event_source, event_value, attributes, occurred_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::timestamptz,NOW())
       ON CONFLICT (id) DO NOTHING`,
      [
        event.id || `aev_${Math.random().toString(36).slice(2, 12)}`,
        event.userId || null,
        event.type || 'legacy_event',
        event.category || 'legacy',
        event.source || null,
        Number(event.amount || 0),
        JSON.stringify(event.metadata || {}),
        event.timestamp || new Date().toISOString()
      ]
    );
  }
}

async function run() {
  if (!postgres.isEnabled()) {
    console.log('[backfill] PostgreSQL is disabled; skipping');
    process.exit(0);
  }

  const users = db.findAll('users');
  const analytics = db.findAll('analytics');

  for (const user of users) {
    await upsertUser(user);
  }

  await insertAnalytics(analytics);

  console.log(`[backfill] complete: users=${users.length}, analytics=${analytics.length}`);
}

run().catch((err) => {
  console.error('[backfill] failed:', err.message);
  process.exit(1);
});
