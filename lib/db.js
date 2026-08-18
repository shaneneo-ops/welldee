// Neon Postgres connection + schema, shared by the /api/portfolio function.
//
// The schema is created on demand (ensureSchema) rather than by a one-off
// setup script. A manual init step has to be run against exactly the same
// database the deployed function uses, and when that assumption is wrong it
// fails invisibly — which is exactly what happened here the first time.
// CREATE TABLE IF NOT EXISTS is idempotent and cheap, and only runs once per
// warm container, so making it self-healing costs nothing and removes a
// whole class of "which database did I initialize?" breakage.

import pg from 'pg';

const { Pool } = pg;

let pool;
let schemaReady;

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set — link the Neon integration to this project.');
    }
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 3, // Serverless: keep the per-container pool small
    });
  }
  return pool;
}

// Deliberately no `users` table and no foreign key. Welldee is single-user
// (one passphrase, see AuthContext), so user_id is just a partition key —
// an FK to a users row nothing ever inserts would reject every write.
export function ensureSchema() {
  if (!schemaReady) {
    const db = getPool();
    schemaReady = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS portfolios (
          user_id TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          version INTEGER NOT NULL DEFAULT 1,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS sync_logs (
          id BIGSERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          action TEXT NOT NULL,
          local_version INTEGER,
          server_version INTEGER,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    })().catch((err) => {
      schemaReady = undefined; // Let the next request retry rather than wedging
      throw err;
    });
  }
  return schemaReady;
}
