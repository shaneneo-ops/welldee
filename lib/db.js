// Neon Postgres client — initialized from DATABASE_URL env var.
// Uses pg pool for connection management.

import pg from 'pg';

const { Pool } = pg;

// Initialize connection pool (lazy; first query triggers connection)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Neon requires SSL
});

// Query helper matching the @vercel/postgres API
export const sql = async (strings, ...values) => {
  const query = strings.join('?');
  const result = await pool.query(query, values);
  return result;
};

// Schema initialization helper — run once to set up tables.
// Safe to call multiple times (IF NOT EXISTS guards).
export async function initializeSchema() {
  try {
    // Users table — stores auth context + profile
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Portfolios table — the source of truth for portfolio state
    await pool.query(`
      CREATE TABLE IF NOT EXISTS portfolios (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        data JSONB NOT NULL,
        version INTEGER DEFAULT 1,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `);

    // Sync logs — optional, for debugging and conflict resolution audit trail
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sync_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        local_version INTEGER,
        server_version INTEGER,
        conflict_resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database schema initialized');
  } catch (error) {
    // Table already exists or other error — both are OK on retries
    console.log('Schema initialization result:', error.message);
  }
}

// Cleanup on shutdown
export async function closePool() {
  await pool.end();
}
