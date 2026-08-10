// Vercel serverless function (zero-config: any file under /api deploys as
// one) — looks up a historical closing price for a ticker. Unlike the IBKR
// proxy in server/, this needs no localhost gateway, so it can run on the
// deployed site rather than only during local dev.
//
// Backed by Yahoo Finance's public, unofficial, no-key chart endpoint — the
// standard no-cost approach for this; no SLA, so every failure mode here is
// designed to degrade to "the caller shows a manual-entry field," never to
// crash the page that called it.

// Our ticker format -> Yahoo's. SGX-listed holdings are entered as `X.SG`
// here but Yahoo lists them under the `.SI` suffix; US tickers are entered
// as `X.US` but Yahoo has no suffix for the primary US listing. Anything
// else passes through unchanged (best effort, not a guarantee of a match).
function toYahooTicker(ticker) {
  if (ticker.endsWith('.SG')) return ticker.slice(0, -3) + '.SI';
  if (ticker.endsWith('.US')) return ticker.slice(0, -3);
  return ticker;
}

export default async function handler(req, res) {
  const { ticker, date } = req.query;

  if (!ticker || !date) {
    res.status(400).json({ error: 'Both "ticker" and "date" (YYYY-MM-DD) query params are required.' });
    return;
  }

  const requested = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(requested.getTime())) {
    res.status(400).json({ error: `"${date}" isn't a valid date.` });
    return;
  }

  const yahooTicker = toYahooTicker(ticker);
  const period1 = Math.floor(requested.getTime() / 1000);
  // A 10-day window comfortably skips New Year's Day + a weekend to find
  // the first trading day on/after the requested date.
  const period2 = period1 + 10 * 24 * 60 * 60;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?period1=${period1}&period2=${period2}&interval=1d`;

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
  const result = data?.chart?.result?.[0];
  const timestamps = result?.timestamp;
  const closes = result?.indicators?.quote?.[0]?.close;

  if (!timestamps || !closes) {
    res.status(404).json({ error: `No trading data found for "${ticker}" (mapped to "${yahooTicker}") near ${date}.` });
    return;
  }

  const idx = closes.findIndex((c) => c != null);
  if (idx === -1) {
    res.status(404).json({ error: `"${ticker}" (mapped to "${yahooTicker}") had no trading days with data near ${date}.` });
    return;
  }

  res.status(200).json({
    ticker,
    resolvedTicker: yahooTicker,
    date: new Date(timestamps[idx] * 1000).toISOString().slice(0, 10),
    closePrice: closes[idx],
  });
}
