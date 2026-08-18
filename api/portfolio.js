// Vercel serverless function — reads and writes the portfolio that keeps
// every browser in sync. Backed by Neon Postgres; see lib/db.js for why the
// schema is created on demand rather than by a setup script.
//
// GET  /api/portfolio  -> { portfolio, version, updatedAt }  (404 if none yet)
// POST /api/portfolio  -> { ok, version }
//
// Identity is the x-user-id header, derived from the passphrase in
// AuthContext. This is a single-user app behind a shared passphrase, so the
// header is a partition key, not an authorization boundary.

import { getPool, ensureSchema } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id');
    res.status(204).end();
    return;
  }

  const userId = req.headers['x-user-id'];
  if (!userId) {
    res.status(401).json({ error: 'Missing x-user-id header' });
    return;
  }

  try {
    const db = getPool();
    await ensureSchema();

    if (req.method === 'GET') {
      const { rows } = await db.query(
        'SELECT data, version, updated_at FROM portfolios WHERE user_id = $1',
        [userId]
      );

      if (rows.length === 0) {
        // Nothing saved yet — the client keeps its local copy and the next
        // save seeds the row. Not an error.
        res.status(404).json({ error: 'No portfolio saved yet' });
        return;
      }

      res.status(200).json({
        portfolio: rows[0].data,
        version: rows[0].version,
        updatedAt: rows[0].updated_at,
      });
      return;
    }

    if (req.method === 'POST') {
      const { portfolio, localVersion } = req.body ?? {};

      // Guard against writing a malformed payload over good data — a
      // truncated or half-built object here would corrupt every browser.
      if (!portfolio?.accounts || !portfolio?.metadata) {
        res.status(400).json({ error: 'Payload is not a valid portfolio' });
        return;
      }

      // Single statement upsert: seeds the row on first write, bumps the
      // version on every later one. Doing this as one atomic statement means
      // two browsers saving at once can't interleave a read and a write.
      const { rows } = await db.query(
        `INSERT INTO portfolios (user_id, data, version)
         VALUES ($1, $2, 1)
         ON CONFLICT (user_id) DO UPDATE
           SET data = EXCLUDED.data,
               version = portfolios.version + 1,
               updated_at = CURRENT_TIMESTAMP
         RETURNING version`,
        [userId, JSON.stringify(portfolio)]
      );

      const newVersion = rows[0].version;

      // Last-write-wins, but record when a client saved against a version
      // the server had already moved past — i.e. another browser wrote in
      // between. Logged for visibility, never blocks the save.
      if (localVersion && localVersion !== newVersion - 1) {
        await db
          .query(
            `INSERT INTO sync_logs (user_id, action, local_version, server_version)
             VALUES ($1, 'concurrent_write', $2, $3)`,
            [userId, localVersion, newVersion]
          )
          .catch(() => {}); // Audit logging must never fail a real save
      }

      res.status(200).json({ ok: true, version: newVersion });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Portfolio API error:', error);
    res.status(500).json({ error: error.message });
  }
}
