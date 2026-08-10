// Vercel serverless function — looks up the latest market price for a
// ticker, backing the "Sync Now" price refresh (see
// PortfolioContext.syncMarketData). Same unauthenticated
// v8/finance/chart endpoint as api/history.js, just reading `meta` for the
// current price instead of a specific historical date.

import { toYahooTicker } from './_lib/toYahooTicker.js';

export default async function handler(req, res) {
  const { ticker } = req.query;

  if (!ticker) {
    res.status(400).json({ error: 'A "ticker" query param is required.' });
    return;
  }

  const yahooTicker = toYahooTicker(ticker);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=1d&range=5d`;

  let upstream;
  try {
    upstream = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  } catch {
    res.status(502).json({ error: `Couldn't reach the price data source for "${ticker}".` });
    return;
  }

  if (!upstream.ok) {
    res.status(404).json({ error: `No price data source found for "${ticker}" (mapped to "${yahooTicker}").` });
    return;
  }

  const data = await upstream.json().catch(() => null);
  const meta = data?.chart?.result?.[0]?.meta;

  if (!meta || typeof meta.regularMarketPrice !== 'number') {
    res.status(404).json({ error: `No current price found for "${ticker}" (mapped to "${yahooTicker}").` });
    return;
  }

  res.status(200).json({
    ticker,
    resolvedTicker: yahooTicker,
    price: meta.regularMarketPrice,
    asOf: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : null,
  });
}
