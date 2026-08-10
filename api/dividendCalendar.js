// Vercel serverless function — looks up next ex-dividend/payment dates and
// trailing dividend rate/yield for a ticker, backing the Dividend Calendar.
//
// Unlike api/history.js's chart endpoint, Yahoo's quoteSummary endpoint
// requires an auth "crumb" tied to a session cookie (verified by hand —
// an unauthenticated call returns {"error":{"code":"Unauthorized"}}). The
// cookie+crumb are fetched once and cached at module scope, so a warm
// Fluid Compute instance reuses them instead of paying two extra Yahoo
// round-trips on every request. Any failure at any step (cookie, crumb, or
// the quoteSummary call itself) degrades to the same graceful JSON error as
// api/history.js — never throws — since the crumb dance is one more thing
// that can fail, not a special case the caller needs to know about.

import { toYahooTicker } from './_lib/toYahooTicker.js';

let cached = null; // { cookie, crumb } | null

async function fetchCookieAndCrumb() {
  if (cached) return cached;

  const cookieRes = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': 'Mozilla/5.0' } });
  // Ignore cookieRes.ok — this endpoint 404s but still sets the session
  // cookie needed for the crumb request below (verified by hand).
  const setCookie = cookieRes.headers.get('set-cookie');
  if (!setCookie) throw new Error('No session cookie returned by Yahoo.');
  const cookie = setCookie.split(';')[0];

  const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': 'Mozilla/5.0', Cookie: cookie },
  });
  if (!crumbRes.ok) throw new Error(`Crumb request failed (${crumbRes.status}).`);
  const crumb = await crumbRes.text();
  if (!crumb) throw new Error('Empty crumb returned by Yahoo.');

  cached = { cookie, crumb };
  return cached;
}

export default async function handler(req, res) {
  const { ticker } = req.query;

  if (!ticker) {
    res.status(400).json({ error: 'A "ticker" query param is required.' });
    return;
  }

  const yahooTicker = toYahooTicker(ticker);

  let auth;
  try {
    auth = await fetchCookieAndCrumb();
  } catch (err) {
    cached = null; // don't keep a bad cache around for the next request
    res.status(502).json({ error: `Couldn't authenticate with the dividend data source: ${err.message}` });
    return;
  }

  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooTicker)}?modules=calendarEvents,summaryDetail&crumb=${encodeURIComponent(auth.crumb)}`;

  let upstream;
  try {
    upstream = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Cookie: auth.cookie } });
  } catch {
    res.status(502).json({ error: `Couldn't reach the dividend data source for "${ticker}".` });
    return;
  }

  if (!upstream.ok) {
    cached = null; // crumb may have expired — force a refetch next time
    res.status(404).json({ error: `No dividend data found for "${ticker}" (mapped to "${yahooTicker}").` });
    return;
  }

  const data = await upstream.json().catch(() => null);
  const result = data?.quoteSummary?.result?.[0];

  if (!result) {
    res.status(404).json({ error: `No dividend data found for "${ticker}" (mapped to "${yahooTicker}").` });
    return;
  }

  const { calendarEvents, summaryDetail } = result;
  const toISODate = (raw) => (raw != null ? new Date(raw * 1000).toISOString().slice(0, 10) : null);

  res.status(200).json({
    ticker,
    resolvedTicker: yahooTicker,
    exDividendDate: toISODate(calendarEvents?.exDividendDate?.raw),
    paymentDate: toISODate(calendarEvents?.dividendDate?.raw),
    trailingDividendRate: summaryDetail?.dividendRate?.raw ?? null,
    // Yahoo returns yield as a decimal fraction (0.0417) — this codebase's
    // dividendYieldPct convention elsewhere is a whole percent (4.17).
    trailingDividendYieldPct: summaryDetail?.dividendYield?.raw != null ? summaryDetail.dividendYield.raw * 100 : null,
  });
}
