// Vercel serverless function — fetch or save user's portfolio from/to Postgres.
// Used by PortfolioContext to sync across browsers/devices.
// Requires: DATABASE_URL env var (auto-set by Vercel Postgres integration)

import { sql } from '@vercel/postgres';

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

  try {
    // GET /api/portfolio — fetch latest portfolio for this user
    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT data, version, updated_at FROM portfolios
        WHERE user_id = ${userId}
        LIMIT 1
      `;

      if (rows.length === 0) {
        res.status(404).json({ error: 'Portfolio not found' });
        return;
      }

      res.status(200).json({
        portfolio: rows[0].data,
        version: rows[0].version,
        updatedAt: rows[0].updated_at,
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
      const { rows: existing } = await sql`
        SELECT version FROM portfolios WHERE user_id = ${userId}
      `;

      if (existing.length > 0) {
        const serverVersion = existing[0].version;

        // Conflict detection: if local version doesn't match server, last-write-wins
        // (user's browser pushed changes, but another browser updated in between)
        if (localVersion && localVersion !== serverVersion) {
          // Log the conflict for audit, but still save (last-write-wins)
          await sql`
            INSERT INTO sync_logs (id, user_id, action, local_version, server_version, conflict_resolved)
            VALUES (
              ${`sync-${Date.now()}-${Math.random()}`},
              ${userId},
              'conflict_detected',
              ${localVersion},
              ${serverVersion},
              true
            )
          `;
        }

        // Update existing portfolio
        await sql`
          UPDATE portfolios
          SET data = ${JSON.stringify(portfolio)},
              version = version + 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ${userId}
        `;
      } else {
        // Create new portfolio for this user
        await sql`
          INSERT INTO portfolios (id, user_id, data, version)
          VALUES (
            ${`portfolio-${userId}-${Date.now()}`},
            ${userId},
            ${JSON.stringify(portfolio)},
            1
          )
        `;
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
