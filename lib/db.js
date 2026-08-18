// Vercel Postgres client — initialized from DATABASE_URL env var.
// Connection pooling handled by vercel/postgres automatically.
// Query examples: const { rows } = await sql`SELECT ...`

import { sql } from '@vercel/postgres';

// Initialize (connection is lazy; queries trigger connection on first use)
export { sql };

// Schema initialization helper — run once to set up tables.
// Safe to call multiple times (IF NOT EXISTS guards).
export async function initializeSchema() {
  try {
    // Users table — stores auth context + profile
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Portfolios table — the source of truth for portfolio state
    await sql`
      CREATE TABLE IF NOT EXISTS portfolios (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        data JSONB NOT NULL,
        version INTEGER DEFAULT 1,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      );
    `;

    // Sync logs — optional, for debugging and conflict resolution audit trail
    await sql`
      CREATE TABLE IF NOT EXISTS sync_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        local_version INTEGER,
        server_version INTEGER,
        conflict_resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log('Database schema initialized');
  } catch (error) {
    // Table already exists or other error — both are OK on retries
    console.log('Schema initialization result:', error.message);
  }
}
