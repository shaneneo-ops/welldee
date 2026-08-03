import express from 'express';
import cors from 'cors';
import { gatewayGet } from './gatewayClient.js';

// Local-only proxy between the Welldee frontend (http://localhost:5173) and
// IBKR's Client Portal Gateway (https://localhost:5000). See README "IBKR
// setup" for why this exists — the gateway can't be called directly from a
// browser. Run alongside `npm run dev`: `npm run server`.
const PORT = process.env.WELLDEE_PROXY_PORT ?? 4000;
const FRONTEND_ORIGIN = process.env.WELLDEE_FRONTEND_ORIGIN ?? 'http://localhost:5173';

const app = express();
app.use(cors({ origin: FRONTEND_ORIGIN }));

app.get('/api/ibkr/status', async (_req, res) => {
  try {
    const status = await gatewayGet('/iserver/auth/status');
    res.json({ gatewayReachable: true, authenticated: Boolean(status?.authenticated) });
  } catch {
    res.json({ gatewayReachable: false, authenticated: false });
  }
});

app.get('/api/ibkr/accounts', async (_req, res) => {
  try {
    const accounts = await gatewayGet('/portfolio/accounts');
    res.json(accounts);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.get('/api/ibkr/portfolio/:accountId/summary', async (req, res) => {
  try {
    const summary = await gatewayGet(`/portfolio/${req.params.accountId}/summary`);
    res.json(summary);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.get('/api/ibkr/portfolio/:accountId/ledger', async (req, res) => {
  try {
    const ledger = await gatewayGet(`/portfolio/${req.params.accountId}/ledger`);
    res.json(ledger);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// The gateway paginates positions 30-per-page — walk pages until one comes
// back empty (or a sane upper bound, in case the account is huge).
app.get('/api/ibkr/portfolio/:accountId/positions', async (req, res) => {
  try {
    const positions = [];
    for (let page = 0; page < 20; page++) {
      const pageResult = await gatewayGet(`/portfolio/${req.params.accountId}/positions/${page}`);
      if (!Array.isArray(pageResult) || pageResult.length === 0) break;
      positions.push(...pageResult);
    }
    res.json(positions);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Welldee IBKR proxy listening on http://localhost:${PORT}`);
  console.log(`Accepting requests from ${FRONTEND_ORIGIN}`);
});
