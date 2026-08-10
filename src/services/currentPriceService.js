// Client for the /api/currentPrice serverless function — latest market
// price for a ticker, used by PortfolioContext.syncMarketData to refresh
// Standard Chartered/DBS holdings on "Sync Now". Same never-throw contract
// as the other Yahoo-backed services in this app.

export async function fetchCurrentPrice(ticker) {
  let res;
  try {
    res = await fetch(`/api/currentPrice?ticker=${encodeURIComponent(ticker)}`);
  } catch {
    return { ok: false, error: 'Network error reaching the price lookup.' };
  }

  // Local `vite dev` has no /api routes — those only exist as Vercel
  // serverless functions — so it 200s with index.html's SPA fallback
  // instead of a real 404. A non-JSON response is always a failure here,
  // regardless of status code.
  if (!res.headers.get('content-type')?.includes('application/json')) {
    return { ok: false, error: 'Price lookup isn\'t available in this environment (needs the deployed site).' };
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok || typeof body.price !== 'number') {
    return { ok: false, error: body.error ?? `Lookup failed (${res.status}).` };
  }
  return { ok: true, price: body.price, asOf: body.asOf, resolvedTicker: body.resolvedTicker };
}
