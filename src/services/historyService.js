// Client for the /api/history serverless function (api/history.js) — a
// historical price lookup, used only by the Jan-1 backcalculation tool in
// Settings. Any failure (network, ticker not found, no data near that date)
// resolves to { ok: false }, never throws — callers show a manual-entry
// field for that one row instead of failing the whole calculator.

export async function fetchHistoricalPrice(ticker, date) {
  let res;
  try {
    res = await fetch(`/api/history?ticker=${encodeURIComponent(ticker)}&date=${encodeURIComponent(date)}`);
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
  if (!res.ok || typeof body.closePrice !== 'number') {
    return { ok: false, error: body.error ?? `Lookup failed (${res.status}).` };
  }
  return { ok: true, price: body.closePrice, resolvedDate: body.date, resolvedTicker: body.resolvedTicker };
}
