// Vercel serverless function — fetch or save user's portfolio from/to Neon Postgres.
// Used by PortfolioContext to sync across browsers/devices.
// Requires: DATABASE_URL env var (auto-set by Neon integration)

import pg from 'pg';

const { Pool } = pg;

// Initialize pool once per Lambda container warm start
let pool;
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

export default async function handler(req, res) {
  // CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const userId = req.headers['x-user-id'];
  if (!userId) {
    res.status(401).json({ error: 'Missing x-user-id header' });
    return;
  }

  const db = getPool();

  try {
    // GET /api/portfolio — fetch latest portfolio for this user
    if (req.method === 'GET') {
      const result = await db.query(
        'SELECT data, version, updated_at FROM portfolios WHERE user_id = $1 LIMIT 1',
        [userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Portfolio not found' });
        return;
      }

      res.status(200).json({
        portfolio: result.rows[0].data,
        version: result.rows[0].version,
        updatedAt: result.rows[0].updated_at,
      });
      return;
    }

    // POST /api/portfolio — save portfolio (with version-based conflict detection)
    if (req.method === 'POST') {
      const { portfolio, localVersion } = req.body;

      if (!portfolio) {
        res.status(400).json({ error: 'Missing portfolio data' });
        return;
      }

      // Upsert: if user's portfolio exists, check version; if not, create
      const existing = await db.query(
        'SELECT version FROM portfolios WHERE user_id = $1',
        [userId]
      );

      if (existing.rows.length > 0) {
        const serverVersion = existing.rows[0].version;

        // Conflict detection: if local version doesn't match server, last-write-wins
        if (localVersion && localVersion !== serverVersion) {
          // Log the conflict for audit, but still save (last-write-wins)
          await db.query(
            `INSERT INTO sync_logs (id, user_id, action, local_version, server_version, conflict_resolved)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              `sync-${Date.now()}-${Math.random()}`,
              userId,
              'conflict_detected',
              localVersion,
              serverVersion,
              true,
            ]
          );
        }

        // Update existing portfolio
        await db.query(
          `UPDATE portfolios
           SET data = $1, version = version + 1, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $2`,
          [JSON.stringify(portfolio), userId]
        );
      } else {
        // Create new portfolio for this user
        await db.query(
          `INSERT INTO portfolios (id, user_id, data, version)
           VALUES ($1, $2, $3, $4)`,
          [
            `portfolio-${userId}-${Date.now()}`,
            userId,
            JSON.stringify(portfolio),
            1,
          ]
        );
      }

      res.status(200).json({ ok: true, message: 'Portfolio saved' });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Portfolio API error:', error);
    res.status(500).json({ error: error.message });
  }
}
