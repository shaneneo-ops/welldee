// Vercel serverless function — looks up this year's actual per-share
// dividend payment history for a ticker, backing the real "shares held ×
// payout so far" YTD income figure in Income Analytics, and a cadence
// fallback for the Dividend Calendar when Yahoo's quoteSummary (see
// api/dividendCalendar.js) has no forward-looking data for a ticker —
// confirmed live for several SGX ETFs (A35.SI, ES3.SI, CLR.SI, MBH.SI all
// return empty calendarEvents/summaryDetail, but do have real dividend
// history here).
//
// Unlike dividendCalendar.js, this reuses the same unauthenticated
// v8/finance/chart endpoint api/history.js already uses successfully, just
// with `events=div` — no crumb/cookie dance needed.

import { toYahooTicker } from './_lib/toYahooTicker.js';

export default async function handler(req, res) {
  const { ticker } = req.query;

  if (!ticker) {
    res.status(400).json({ error: 'A "ticker" query param is required.' });
    return;
  }

  const yahooTicker = toYahooTicker(ticker);
  const yearStart = Math.floor(new Date(`${new Date().getUTCFullYear()}-01-01T00:00:00Z`).getTime() / 1000);
  const now = Math.floor(Date.now() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?period1=${yearStart}&period2=${now}&interval=1d&events=div`;

  let upstream;
  try {
    upstream = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  } catch {
    res.status(502).json({ error: `Couldn't reach the dividend history source for "${ticker}".` });
    return;
  }

  if (!upstream.ok) {
    res.status(404).json({ error: `No dividend history found for "${ticker}" (mapped to "${yahooTicker}").` });
    return;
  }

  const data = await upstream.json().catch(() => null);
  const result = data?.chart?.result?.[0];

  if (!result) {
    res.status(404).json({ error: `No dividend history found for "${ticker}" (mapped to "${yahooTicker}").` });
    return;
  }

  // A ticker with zero dividend events so far this year is valid data, not
  // a failure — e.g. a holding whose only 2026 payout hasn't gone ex-div
  // yet. `events` is entirely absent from Yahoo's response when there are
  // no events in the window, rather than an empty object.
  const dividends = Object.values(result.events?.dividends ?? {})
    .map((d) => ({ date: new Date(d.date * 1000).toISOString().slice(0, 10), amountPerShare: d.amount }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  res.status(200).json({ ticker, resolvedTicker: yahooTicker, dividends });
}
